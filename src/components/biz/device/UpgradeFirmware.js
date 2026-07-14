import { Box, Drawer, ListItem, ListItemIcon, ListItemText, List, Typography } from '@mui/material';
import { Error } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { gConfig } from '@/constants/gConfig';
import { registerIotCallback } from '@/hooks/useIotCallbackRegistry';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

const UpgradeFirmware = ({ device: currentDevice, Hub3DeviceUUID, bleAvailable = false }) => {
  const { gIot, gManageDevice } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // updateProgress: UI 实际显示的（动画）值； reportedProgress: 设备上报的原始值/状态码
  const [updateProgress, setUpdateProgress] = useState(null);
  const [reportedProgress, setReportedProgress] = useState(null);
  const intervalRef = useRef(null);

  const DFU_STATUS_MESSAGES = {
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
  }, [reportedProgress]);

  const notifyAppDeviceFWVersionUpdated = (deviceUUID, currentFwVer) => {
    if (!deviceUUID || !currentFwVer) return;

    biz3utils.triggerBridge({
      action: 'requestUpdateDeviceFWVersion',
      deviceUUID,
      currentFwVer,
    });
  };

  const requestDeviceFWUpgradeFromApp = useCallback(() => {
    const requestId = Date.now().toString();
    window[`deviceListCallback_${requestId}`] = (data) => {
      const { deviceUUID, percent } = data;
      const p = parseInt(percent, 10);
      if (p === 100) {
        setReportedProgress(DFU_PROGRESS_COMPLETED);
        setTimeout(() => {
          let newFwVer = '';

          gManageDevice.setCompanyDevices((prevDevices) =>
            prevDevices.map((device) => {
              if (device.deviceUUID !== deviceUUID) return device;

              newFwVer = device.stateInfo?.latestFwVer ?? '';

              return {
                ...device,
                stateInfo: {
                  ...device.stateInfo,
                  currentFwVer: newFwVer,
                },
              };
            })
          );

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
  }, []);

  const handleOSUpdate = () => {
    gIot.sendCommandToHub3WithConnectionId({
      device_id: currentDevice.deviceUUID,
      hub3_id: gUtils.isWifiModel(currentDevice.deviceModel) ? currentDevice.deviceUUID : Hub3DeviceUUID,
      cmd: gConfig.cmdCode.ssmOSUpdate,
      secretKey: currentDevice.secretKey,
    });
    registerIotCallback(gConfig.cmdCode.ssmOSUpdate, (iotDeviceUUID, data) => {
      console.log('ssmOSUpdate callback data: ', iotDeviceUUID, data);
      const { progress, versionTag = '', UUID = '' } = data;
      if (UUID !== currentDevice.deviceUUID) return;
      if (versionTag) {
        const targetDeviceUUID = UUID || currentDevice.deviceUUID;
        gManageDevice.setCompanyDevices((prevDevices) =>
          prevDevices.map((device) =>
            device.deviceUUID === targetDeviceUUID
              ? {
                  ...device,
                  stateInfo: {
                    ...device.stateInfo,
                    currentFwVer: versionTag,
                    latestFwVer: versionTag,
                  },
                }
              : device
          )
        );

        notifyAppDeviceFWVersionUpdated(targetDeviceUUID, versionTag);

        setReportedProgress(null);
      } else {
        setReportedProgress(progress);
      }
    });
  };

  useEffect(() => {
    return () => {
      clearProgressInterval();
    };
  }, []);

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
      <ListItem onClick={() => setDrawerOpen(true)}>
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
                if (bleAvailable) {
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
