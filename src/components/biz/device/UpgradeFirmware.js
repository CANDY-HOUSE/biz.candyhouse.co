import { isPeripheralModel, peripheralCapabilities } from '@/services/peripheralSettings';
import { isBotModel } from '@/services/botScripts';
import { deviceService, isAppHome } from '@/services/deviceService';
import { appOperation } from '@/services/appOperations';
import { isAppLockModel } from '@/services/appLockSettings';
import { Box, Drawer, ListItem, ListItemIcon, ListItemText, List, Typography } from '@mui/material';
import { Error } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { gConfig } from '@/constants/gConfig';
import { registerIotCallback, unregisterIotCallback, getIotCallbacks } from '@/hooks/useIotCallbackRegistry';
import { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { gUtils } from '@/utils/gUtils';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { biz3utils } from '@/utils/biz3utils';

// DFU 进度状态码, 负数表示不同的中间状态， 0-100 表示百分比进度
const DFU_PROGRESS_CONNECTING = -1;
const DFU_PROGRESS_STARTING = -2;
const DFU_PROGRESS_ENABLING_DFU_MODE = -3;
const DFU_PROGRESS_VALIDATING = -4;
const DFU_PROGRESS_DISCONNECTING = -5;
const DFU_PROGRESS_COMPLETED = -6;
const DFU_PROGRESS_ABORTED = -7;
const DFU_PROGRESS_CONNECTED = -8;
const DFU_PROGRESS_STARTED = -9;
const DFU_PROGRESS_DISCONNECTED = -10;

const UpgradeFirmware = ({ device: currentDevice, Hub3DeviceUUID, bleAvailable = false, readOnly = false }) => {
  const nativeDevices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const native = nativeDevices[currentDevice.deviceUUID?.toUpperCase()];
  const peripheral = isPeripheralModel(currentDevice.deviceModel);
  const gatewayPeripheral = peripheralCapabilities(currentDevice.deviceModel).some(
    (kind) => kind === 'card' || kind === 'face'
  );
  const appLock =
    isAppHome && (isAppLockModel(currentDevice.deviceModel) || isBotModel(currentDevice.deviceModel) || peripheral);
  const appHub = isAppHome && ['hub_3', 'hub_3_pro'].includes(currentDevice.deviceModel);
  const [nativeUpdating, setNativeUpdating] = useState(false);
  const { gIot, gManageDevice, setSnackbarValue } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // updateProgress: UI 实际显示的（动画）值； reportedProgress: 设备上报的原始值/状态码
  const [updateProgress, setUpdateProgress] = useState(null);
  const [reportedProgress, setReportedProgress] = useState(null);
  const intervalRef = useRef(null);
  const preparingUpdate = useRef(false);
  const transport = useRef(null);
  const lastNative = useRef('');
  const versionDue = useRef(true);
  const versionAttempts = useRef(0);
  const versionNextTry = useRef(0);
  const connected = useRef(false);
  connected.current = native?.bleConnected === true;
  const hubProgress = useRef(null);
  hubProgress.current = native?.hub?.otaProgress;
  const hubExpectedVersion = useRef(null);
  const gatewayLastEvent = useRef(0);
  const gatewaySession = useRef(false);
  const gatewayTerminal = useRef(false);
  const gatewayCallback = useRef(null);
  const trace = (phase, progress = -1) => {
    if (appLock) deviceService.notify('firmwareTrace', { transport: transport.current || 'ble', phase, progress });
  };

  const DFU_STATUS_MESSAGES = {
    [-11]: t('lockSettings.downloading'),
    [DFU_PROGRESS_CONNECTING]: t('pages.sesameAccessControlDevice.index.DFU_CONNECTING'),
    [DFU_PROGRESS_STARTING]: t('pages.sesameAccessControlDevice.index.DFU_STARTING'),
    [DFU_PROGRESS_ENABLING_DFU_MODE]: t('pages.sesameAccessControlDevice.index.DFU_ENABLING_DFU_MODE'),
    [DFU_PROGRESS_VALIDATING]: t('pages.sesameAccessControlDevice.index.DFU_VALIDATING'),
    [DFU_PROGRESS_DISCONNECTING]: t('pages.sesameAccessControlDevice.index.DFU_DISCONNECTING'),
    [DFU_PROGRESS_COMPLETED]: t('pages.sesameAccessControlDevice.index.DFU_COMPLETED'),
    [DFU_PROGRESS_ABORTED]: t('pages.sesameAccessControlDevice.index.DFU_ABORTED'),
    [DFU_PROGRESS_CONNECTED]: t('pages.sesameAccessControlDevice.index.DFU_CONNECTED'),
    [DFU_PROGRESS_STARTED]: t('pages.sesameAccessControlDevice.index.DFU_STARTED'),
    [DFU_PROGRESS_DISCONNECTED]: t('pages.sesameAccessControlDevice.index.DFU_DISCONNECTED'),
  };

  const clearProgressInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  useEffect(() => {
    if (appLock) {
      clearProgressInterval();
      setUpdateProgress(reportedProgress);
      return;
    }
    if (reportedProgress === null) {
      clearProgressInterval();
      setUpdateProgress(null);
      return;
    }
    // 负数为中间状态码：直接显示，不做百分比动画
    if (reportedProgress < 0 || reportedProgress > 100) {
      clearProgressInterval();
      setUpdateProgress(reportedProgress);
      return;
    }
    // 0~100：以「上报值 +10」为目标（封顶 99），从当前显示值平滑递增到目标。
    // effect 仅依赖 reportedProgress，故动画自身的 +1（只改 updateProgress）不会重新触发；
    // 而设备每次上报（即使值与当前目标相同/更小）都会重设目标并继续向上动画。
    const targetProgress = reportedProgress < 100 ? Math.min(reportedProgress + 10, 99) : 100;
    clearProgressInterval();
    // 从 null/状态码进入数值阶段时先置 0%，避免短暂显示旧值；已是数值则保持不回退不跳段
    setUpdateProgress((prev) => (prev === null || prev < 0 ? 0 : prev));
    intervalRef.current = setInterval(() => {
      setUpdateProgress((prev) => {
        const cur = prev === null || prev < 0 ? 0 : prev;
        if (cur + 1 >= targetProgress) {
          clearProgressInterval();
          return Math.max(cur, targetProgress);
        }
        return cur + 1;
      });
    }, 300);
  }, [reportedProgress, appLock]);

  const notifyAppDeviceFWVersionUpdated = (deviceUUID, currentFwVer) => {
    if (!deviceUUID || !currentFwVer) return;

    biz3utils.triggerBridge({
      action: 'requestUpdateDeviceFWVersion',
      deviceUUID,
      currentFwVer,
    });
  };

  useEffect(() => {
    if (!appHub) return;
    const progress = native?.hub?.otaProgress;
    setReportedProgress(Number.isFinite(progress) ? (progress === 100 ? DFU_PROGRESS_COMPLETED : progress) : null);
    if (progress !== 100) return;
    hubExpectedVersion.current = currentDevice.stateInfo?.latestFwVer || null;
    const timer = setTimeout(() => {
      setReportedProgress(null);
      // Consume the completed event so remounting cannot restore a stale 100% snapshot.
      deviceService.notify('hubSettings', { deviceUUID: currentDevice.deviceUUID, operation: 'firmwareFinish' });
      versionDue.current = true;
      versionAttempts.current = 0;
      versionNextTry.current = Date.now() + 3000;
      gManageDevice.getDeviceStatus(currentDevice.deviceUUID);
    }, 1000);
    return () => clearTimeout(timer);
  }, [appHub, native?.hub?.otaProgress, currentDevice.deviceUUID]);

  useEffect(() => {
    if (!appHub) return;
    let active = true;
    let pending = false;
    const poll = async () => {
      if (
        pending ||
        !connected.current ||
        preparingUpdate.current ||
        (hubProgress.current >= 0 && hubProgress.current <= 100) ||
        !versionDue.current ||
        versionAttempts.current >= 3 ||
        Date.now() < versionNextTry.current
      )
        return;
      pending = true;
      versionAttempts.current += 1;
      versionNextTry.current = Date.now() + 10000;
      try {
        const { data } = await deviceService.request('hubSettings', {
          deviceUUID: currentDevice.deviceUUID,
          operation: 'version',
        });
        if (!active || preparingUpdate.current || (hubProgress.current >= 0 && hubProgress.current <= 100)) return;
        if (data.version) {
          gManageDevice.updateDeviceState({
            deviceUUID: currentDevice.deviceUUID,
            stateInfo: { currentFwVer: data.version },
          });
          // A 100% notification can precede the reboot; retry if this is still the old version.
          versionDue.current = !!hubExpectedVersion.current && data.version !== hubExpectedVersion.current;
        }
      } catch (_) {
        // Retry version reads after the Hub has rebooted without showing a spurious OTA error.
      } finally {
        pending = false;
      }
    };
    poll();
    const timer = setInterval(poll, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [appHub, currentDevice.deviceUUID]);

  const requestDeviceFWUpgradeFromApp = useCallback(() => {
    if (isAppHome) {
      if (preparingUpdate.current || (hubProgress.current >= 0 && hubProgress.current < 100)) return;
      preparingUpdate.current = true;
      hubExpectedVersion.current = currentDevice.stateInfo?.latestFwVer || null;
      setReportedProgress(0);
      deviceService
        .request('hubSettings', { deviceUUID: currentDevice.deviceUUID, operation: 'firmware' })
        .catch(() => {
          setReportedProgress(null);
          setSnackbarValue({
            logScope: 'components/biz/device/UpgradeFirmware.requestDeviceFWUpgradeFromApp',
            logReason: 'lockSettings.failed',
            open: true,
            msg: t('lockSettings.failed'),
            severity: 'error',
          });
        })
        .finally(() => {
          preparingUpdate.current = false;
        });
      return;
    }
    const requestId = Date.now().toString();
    window[`deviceListCallback_${requestId}`] = (data) => {
      const { deviceUUID, percent } = data;
      const p = parseInt(percent, 10);
      if (p === 100) {
        setReportedProgress(DFU_PROGRESS_COMPLETED);
        setTimeout(() => {
          const target =
            gManageDevice.companyDevices.find((d) => d.deviceUUID === deviceUUID) || gManageDevice.deviceStatus;
          const newFwVer = target?.stateInfo?.latestFwVer ?? '';
          gManageDevice.updateDeviceState({
            deviceUUID,
            stateInfo: { currentFwVer: newFwVer },
          });
          notifyAppDeviceFWVersionUpdated(deviceUUID, newFwVer);
          setReportedProgress(null);
        }, 1000);
        return;
      }
      setReportedProgress(p);
    };
    biz3utils.triggerBridge({
      action: 'requestDeviceFWUpgrade',
      requestId: requestId,
      callbackName: `deviceListCallback_${requestId}`,
    });
  }, [currentDevice.deviceUUID]);

  const handleOSUpdate = () => {
    if (appLock) {
      transport.current = 'gateway';
      gatewaySession.current = true;
      gatewayTerminal.current = false;
      gatewayLastEvent.current = Date.now();
      setNativeUpdating(true);
      setReportedProgress(DFU_PROGRESS_CONNECTING);
      trace('start');
    }
    const receive = (iotDeviceUUID, data) => {
      const progress = Number(data.progress);
      const versionTag = data.versionTag || '';
      const UUID = data.UUID || iotDeviceUUID || '';
      if (UUID.toUpperCase() !== currentDevice.deviceUUID?.toUpperCase()) return;
      if (appLock && (!gatewaySession.current || (gatewayTerminal.current && !versionTag))) return;
      gatewayLastEvent.current = Date.now();
      if (versionTag) {
        const targetDeviceUUID = UUID || currentDevice.deviceUUID;
        gManageDevice.updateDeviceState({
          deviceUUID: targetDeviceUUID,
          stateInfo: {
            currentFwVer: versionTag,
            latestFwVer: versionTag,
          },
        });
        notifyAppDeviceFWVersionUpdated(targetDeviceUUID, versionTag);
        gatewayTerminal.current = true;
        trace('completed');
        transport.current = null;
        setNativeUpdating(false);
        setReportedProgress(null);
      } else if (appLock && progress === DFU_PROGRESS_COMPLETED) {
        gatewayTerminal.current = true;
        trace('completed');
        transport.current = null;
        setNativeUpdating(false);
        setReportedProgress(null);
        versionDue.current = true;
        versionAttempts.current = 0;
        gManageDevice.getDeviceStatus(currentDevice.deviceUUID);
      } else {
        trace('progress', progress);
        setReportedProgress(progress);
        if (appLock && progress === DFU_PROGRESS_ABORTED) {
          gatewayTerminal.current = true;
          trace('failed');
          transport.current = null;
          setNativeUpdating(false);
        }
      }
    };
    gatewayCallback.current = receive;
    registerIotCallback(gConfig.cmdCode.ssmOSUpdate, receive);
    gIot
      .sendCommandToHub3WithConnectionId({
        device_id: currentDevice.deviceUUID,
        hub3_id: gUtils.isWifiModel(currentDevice.deviceModel) ? currentDevice.deviceUUID : Hub3DeviceUUID,
        cmd: gConfig.cmdCode.ssmOSUpdate,
        secretKey: currentDevice.secretKey,
      })
      .catch(() => {
        if (appLock) {
          gatewayTerminal.current = true;
          trace('failed');
          transport.current = null;
          setNativeUpdating(false);
          setReportedProgress(DFU_PROGRESS_ABORTED);
        }
      });
  };

  useEffect(() => {
    return () => {
      clearProgressInterval();
      if (gatewayCallback.current && getIotCallbacks(gConfig.cmdCode.ssmOSUpdate) === gatewayCallback.current)
        unregisterIotCallback(gConfig.cmdCode.ssmOSUpdate);
    };
  }, []);

  useEffect(() => {
    if (native?.bleConnected) {
      versionDue.current = true;
      versionAttempts.current = 0;
      versionNextTry.current = 0;
    }
  }, [native?.bleConnected]);

  useEffect(() => {
    if (!appLock) return;
    let active = true;
    let pending = false;
    const poll = async () => {
      if (pending || preparingUpdate.current) return;
      pending = true;
      try {
        if (transport.current === 'gateway') {
          if (Date.now() - gatewayLastEvent.current > 180000) {
            gatewayTerminal.current = true;
            trace('failed');
            transport.current = null;
            setNativeUpdating(false);
            setReportedProgress(DFU_PROGRESS_ABORTED);
            gManageDevice.getDeviceStatus(currentDevice.deviceUUID);
          }
          return;
        }
        const { data } = await deviceService.request('firmwareStatus');
        if (!active || preparingUpdate.current || transport.current === 'gateway') return;
        const same = data.deviceUUID === currentDevice.deviceUUID?.toUpperCase();
        const running = same && ['downloading', 'updating'].includes(data.state);
        if (running) {
          transport.current = 'ble';
          setNativeUpdating(true);
          setReportedProgress(data.state === 'downloading' ? -11 : data.progress);
          lastNative.current = `${data.sessionId}:${data.state}`;
          return;
        }
        const terminal = `${data.sessionId}:${data.state}`;
        if (same && terminal !== lastNative.current) {
          lastNative.current = terminal;
          if (data.state === 'completed') {
            setReportedProgress(null);
            versionDue.current = true;
            versionAttempts.current = 0;
          } else if (data.state === 'failed' && transport.current === 'ble') setReportedProgress(DFU_PROGRESS_ABORTED);
          transport.current = null;
          setNativeUpdating(false);
        }
        if (
          versionDue.current &&
          connected.current &&
          versionAttempts.current < 3 &&
          Date.now() >= versionNextTry.current
        ) {
          versionAttempts.current += 1;
          versionNextTry.current = Date.now() + 10000;
          const { data: version } = await deviceService.request(
            peripheral ? (currentDevice.deviceModel === 'wm_2' ? 'hubSettings' : 'peripheralSettings') : 'lockSettings',
            {
              deviceUUID: currentDevice.deviceUUID,
              operation: 'version',
            }
          );
          if (!active || transport.current || preparingUpdate.current) return;
          if (version.version) {
            gManageDevice.updateDeviceState({
              deviceUUID: currentDevice.deviceUUID,
              stateInfo: { currentFwVer: version.version },
            });
            versionDue.current = false;
            trace('version');
          }
        }
      } catch (_) {
        // Background version reads are retried without showing an operation error.
      } finally {
        pending = false;
      }
    };
    poll();
    const timer = setInterval(poll, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [appLock, currentDevice.deviceUUID]);

  const startAppUpdate = async () => {
    if (readOnly || nativeUpdating || preparingUpdate.current) return;
    if (!native?.bleConnected) {
      if (currentDevice.stateInfo?.wm2State === true && Hub3DeviceUUID) handleOSUpdate();
      else setSnackbarValue({ open: true, msg: t('lockSettings.connectBluetooth') });
      return;
    }
    preparingUpdate.current = true;
    transport.current = 'ble';
    gatewaySession.current = false;
    lastNative.current = '';
    trace('start');
    setNativeUpdating(true);
    try {
      const { data } = await deviceService.request('firmwareInfo', { deviceUUID: currentDevice.deviceUUID });
      const firmware = await appOperation('firmwareZip', data, { deviceUUID: currentDevice.deviceUUID });
      if (firmware?.ok !== true || !firmware.zipUrl) throw new Error('Firmware unavailable');
      await deviceService.request('firmwareStart', { deviceUUID: currentDevice.deviceUUID, url: firmware.zipUrl });
      setReportedProgress(-11);
    } catch (_) {
      trace('failed');
      transport.current = null;
      setNativeUpdating(false);
      setSnackbarValue({
        logScope: 'components/biz/device/UpgradeFirmware.startAppUpdate',
        logReason: 'lockSettings.failed',
        severity: 'error',
        open: true,
        msg: t('lockSettings.failed'),
      });
    } finally {
      preparingUpdate.current = false;
    }
  };

  const isLatestVer = useMemo(() => {
    if (updateProgress !== null) {
      return false;
    }
    return currentDevice.stateInfo?.currentFwVer === currentDevice.stateInfo?.latestFwVer;
  }, [updateProgress, currentDevice]);

  const displayVer = useMemo(() => {
    if (updateProgress === null) {
      return currentDevice.stateInfo?.currentFwVer ?? '';
    }
    return DFU_STATUS_MESSAGES[updateProgress] ?? `${updateProgress}%`;
  }, [updateProgress, currentDevice]);

  return (
    <>
      <ListItem
        onClick={() => {
          if (readOnly) return;
          if (peripheral && !isAppHome && !gatewayPeripheral) {
            setSnackbarValue({ open: true, msg: 'Coming soon', severity: 'info' });
            return;
          }
          setDrawerOpen(true);
        }}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex' }}>
              <>{t('pages.sesameAccessControlDevice.index.OSUpdate')}</>
              {!isLatestVer && (
                <ListItemIcon sx={{ minWidth: 'auto', color: 'error.main' }}>
                  <Error />
                </ListItemIcon>
              )}
            </Box>
          }
        />
        <Typography
          sx={{ color: 'title.other' }}
        >{`${displayVer}${isLatestVer ? t('pages.sesameAccessControlDevice.index.Latest') : ''}`}</Typography>
      </ListItem>
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            maxHeight: '50vh',
          },
        }}
      >
        <Box sx={{ width: '100%', '& .MuiListItem-root': { justifyContent: 'center' } }}>
          <List>
            <ListItem>
              <Typography sx={{ color: 'rgb(204, 204, 204)' }}>
                {t('pages.sesameAccessControlDevice.index.OSUpdate')}
              </Typography>
            </ListItem>
            <ListItem
              onClick={() => {
                setDrawerOpen(false);
                if (appLock) {
                  startAppUpdate();
                } else if (bleAvailable) {
                  requestDeviceFWUpgradeFromApp();
                } else {
                  handleOSUpdate();
                }
              }}
            >
              <Typography>{t('deviceMember.opt.ok')}</Typography>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};
export default UpgradeFirmware;
