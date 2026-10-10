import PageHeader from '@/components/PageHeader';
import BackButton from '@/components/BackButton';
import WifiNetworkStatus from './WifiNetworkStatus';
import { SvgArrow } from '@/assets/svg/svgLock';
import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  SvgIcon,
  Typography,
} from '@mui/material';
import { Close, DeleteOutline, Error } from '@mui/icons-material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { deviceService, isAppHome } from '@/services/deviceService';
import { deviceDetailFor } from '@/services/deviceDetail';
import {
  isBike,
  isSleepy,
  peripheralCapabilities,
  credentialLabels,
  radarCommand,
  radarDistance,
  radarValue,
  radarMaximumDistanceValue,
  shouldFixLegacyRadarValue,
} from '@/services/peripheralSettings';
import { isAppLockModel } from '@/services/appLockSettings';
import { isBotModel } from '@/services/botScripts';
import usePeripheralSettings from '@/hooks/usePeripheralSettings';
import MobileDeviceSetting from './MobileDeviceSetting';
import MobileBindDevice from './MobileBindDevice';
import MobileRemoveDevice from './MobileRemoveDevice';
import BleStatusBar from './BleStatusBar';
import BatteryPercent from './biz/device/BatteryPercent';
import UpgradeFirmware from './biz/device/UpgradeFirmware';
import LockSettingsExtras from './LockSettingsExtras';
import LockSettingsSlider from './LockSettingsSlider';
import LockSettingWheel from './LockSettingWheel';
import AppHubWifi from './AppHubWifi';

export default function PeripheralDeviceSetting({ showBack = true }) {
  const { gManageDevice, gStripe, setSnackbarValue } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = params.get('deviceUUID') || '';
  const detail = deviceDetailFor(id, gManageDevice.deviceStatus, gManageDevice.companyDevices);
  const device = {
    ...detail,
    deviceUUID: id,
    deviceModel: detail.deviceModel || params.get('deviceModel') || '',
    stateInfo: { ...detail.stateInfo },
  };
  const model = device.deviceModel;
  const wifi = model === 'wm_2';
  const pcConnector = !isAppHome && !wifi && !isBike(model);
  const { native, request, ready } = usePeripheralSettings(id, wifi);
  if (native?.batteryPercentage != null) device.stateInfo.batteryPercentage = native.batteryPercentage;
  const sleeping = isSleepy(model) && !native?.peripheral?.setup;
  useEffect(() => {
    if (native?.batteryPercentage == null) return;
    const listed = gManageDevice.companyDevices.find((item) => item.deviceUUID?.toUpperCase() === id.toUpperCase());
    if (listed && listed.stateInfo?.batteryPercentage !== native.batteryPercentage) {
      gManageDevice.updateDeviceState({
        deviceUUID: listed.deviceUUID,
        stateInfo: { batteryPercentage: native.batteryPercentage },
      });
    }
  }, [id, native?.batteryPercentage]);
  const caps = peripheralCapabilities(model);
  const [wifiOpen, setWifiOpen] = useState(false);
  const [bindOpen, setBindOpen] = useState(false);
  const [bindingTarget, setBindingTarget] = useState(null);
  const [delayOpen, setDelayOpen] = useState(false);
  const trackingRadar = useRef(false);
  const fixingRadar = useRef(null);
  const lastBindingWarning = useRef(null);
  const [distance, setDistance] = useState(0);
  const [busy, setBusy] = useState(false);
  const bound =
    native?.peripheral?.bound || (device.stateInfo?.sesameDevices || []).map((d) => d.deviceUUID).filter(Boolean);
  useEffect(() => {
    if (id) gManageDevice.getDeviceStatus(id);
  }, [id]);
  const fail = () =>
    setSnackbarValue({
      logScope: 'components/PeripheralDeviceSetting.fail',
      logReason: 'lockSettings.failed',
      open: true,
      msg: t('lockSettings.failed'),
      severity: 'error',
    });
  const coming = () => setSnackbarValue({ open: true, msg: 'Coming soon', severity: 'info' });
  const available = () => {
    if (!isAppHome) {
      coming();
      return false;
    }
    if (!native?.bleConnected) {
      setSnackbarValue({ open: true, msg: t('lockSettings.connectBluetooth') });
      return false;
    }
    return true;
  };
  const run = async (op, body) => {
    if (busy || !available()) return false;
    setBusy(true);
    try {
      await request(op, body);
      return true;
    } catch (_) {
      fail();
      return false;
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const warning = native?.peripheral?.bindingWarning;
    if (!warning || lastBindingWarning.current === warning.revision) return;
    lastBindingWarning.current = warning.revision;
    setSnackbarValue({ open: true, msg: t(`peripheral.${warning.code}`), severity: 'warning' });
  }, [native?.peripheral?.bindingWarning?.revision]);
  useEffect(() => {
    const value = native?.peripheral?.radar;
    if (value === undefined || !caps.includes('face')) return;
    if (shouldFixLegacyRadarValue(model, value)) {
      if (native?.bleConnected && fixingRadar.current !== `${id}:${value}`) {
        fixingRadar.current = `${id}:${value}`;
        request('radar', { value: radarMaximumDistanceValue(model), command: radarCommand(model) }).catch(fail);
      }
      return;
    }
    fixingRadar.current = null;
    if (!trackingRadar.current) setDistance(radarDistance(model, value));
  }, [id, model, native?.peripheral?.radar, native?.bleConnected]);
  useEffect(() => {
    if (!wifi || !ready || !native?.bleConnected) return;
    deviceService.request('hubSettings', { deviceUUID: id, operation: 'scan' }).catch(fail);
    if (params.get('setup') === '1') setWifiOpen(true);
  }, [wifi, ready, native?.bleConnected, id]);
  const row = (label, value, click) => (
    <React.Fragment key={label}>
      <ListItem onClick={click} sx={{ cursor: click ? 'pointer' : 'default', minHeight: 53 }}>
        <ListItemText primary={label} sx={{ flex: label === 'UUID' ? '0 0 auto' : 1, mr: 1 }} />
        <Typography
          component="div"
          sx={{
            color: 'text.secondary',
            textAlign: 'right',
            ...(label === 'UUID'
              ? { ml: 'auto', whiteSpace: 'nowrap', fontSize: 'clamp(10px, 3.3vw, 14px)', letterSpacing: 0 }
              : { overflowWrap: 'anywhere', maxWidth: '65%' }),
          }}
        >
          {value}
        </Typography>
      </ListItem>
      <Divider variant="middle" sx={{ opacity: 0.4 }} />
    </React.Fragment>
  );
  const openChild = (kind) => {
    if (!isAppHome) {
      const path =
        kind === 'card' ? '/biz/access-control/cards' : kind === 'passcode' ? '/biz/access-control/passwords' : '';
      if (!path) return coming();
      navigate(path, { state: { title: device.deviceName || params.get('deviceName') || '', uuid: id } });
      return;
    }
    const search = new URLSearchParams(location.search);
    search.set('kind', kind);
    search.set('deviceModel', model);
    navigate({ pathname: '/device-setting/credentials', search: search.toString() });
  };
  const targets = gManageDevice.companyDevices.filter((target) => {
    if (
      !target.deviceUUID ||
      target.deviceUUID.toUpperCase() === id.toUpperCase() ||
      Number(target.keyLevel) === 2 ||
      bound.some((x) => x.toUpperCase() === target.deviceUUID.toUpperCase())
    )
      return false;
    if (wifi)
      return [
        'sesame_2',
        'sesame_4',
        'sesame_5',
        'sesame_5_pro',
        'sesame_5_us',
        'sesame_6',
        'sesame_6_pro',
        'BLE_Connector_1',
        'sesame_miwa',
        'sesame_6_pro_slidingdoor',
        'ssmbot_1',
        'bike_1',
      ].includes(target.deviceModel);
    const lockTarget = (d) =>
      isAppLockModel(d.deviceModel) ||
      isBike(d.deviceModel) ||
      isBotModel(d.deviceModel) ||
      d.deviceModel === 'hub_3_pro';
    if (!model.startsWith('open_sensor')) return lockTarget(target);
    const boundDevices = gManageDevice.companyDevices.filter((d) =>
      bound.some((x) => x.toUpperCase() === d.deviceUUID?.toUpperCase())
    );
    if (boundDevices.some(lockTarget)) return lockTarget(target);
    if (boundDevices.some((d) => ['hub_3', 'hub_3_pro'].includes(d.deviceModel)))
      return ['hub_3', 'hub_3_pro'].includes(target.deviceModel);
    return lockTarget(target) || target.deviceModel === 'hub_3';
  });
  const title = device.deviceName || params.get('deviceName') || model;
  return (
    <Box sx={{ height: showBack ? '100dvh' : '100%', overflowY: 'auto', bgcolor: 'background.default' }}>
      {showBack && (
        <PageHeader>
          <BackButton onClick={() => navigate(-1)}></BackButton>
          <Typography variant="h3">{title}</Typography>
        </PageHeader>
      )}
      {isAppHome && !sleeping && <BleStatusBar deviceUUID={id} />}
      <List>
        {!wifi && (
          <>
            <MobileDeviceSetting />
            <Box sx={{ bgcolor: 'secondary.main', height: 10 }} />
          </>
        )}
        {row(t('pages.sesameAccessControlDevice.index.DeviceModel'), model)}
        {model === 'remote_nano' && !sleeping && (
          <>
            {row(
              t('peripheral.triggerDelay'),
              t('peripheral.delayValue', { value: ((native?.peripheral?.triggerDelay || 0) * 0.3).toFixed(1) }),
              () => {
                if (available()) setDelayOpen((open) => !open);
              }
            )}
            {delayOpen && (
              <LockSettingWheel
                values={[0, 10]}
                value={native?.peripheral?.triggerDelay || 0}
                label={(value) => t('peripheral.delayValue', { value: (value * 0.3).toFixed(1) })}
                title={t('peripheral.triggerDelay')}
                disabled={busy || !native?.bleConnected}
                onChange={async (value) => {
                  if (await run('triggerDelay', { value })) setDelayOpen(false);
                }}
              />
            )}
          </>
        )}
        {wifi && (
          <>
            {row('SSID', native?.hub?.wifiSsid || '', () => {
              if (available()) setWifiOpen(true);
            })}
            {row(t('peripheral.password'), native?.hub?.wifiPwd || '', () => {
              if (available()) setWifiOpen(true);
            })}
            {row(
              t('peripheral.network'),
              <WifiNetworkStatus
                status={
                  native?.bleConnected
                    ? native?.hub?.network
                    : {
                        isAPWork: device.stateInfo?.wm2State === true,
                        isNetwork: device.stateInfo?.wm2State === true,
                        isIoTWork: device.stateInfo?.wm2State === true,
                      }
                }
              />
            )}
          </>
        )}
        {caps.map((kind) =>
          row(t(`accessCtl.auth.${credentialLabels[kind]}`), <SvgIcon component={SvgArrow} />, () => openChild(kind))
        )}
        <UpgradeFirmware
          key={id}
          device={device}
          Hub3DeviceUUID={device.stateInfo?.wm2UUID}
          readOnly={wifi || sleeping}
        />
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        {!wifi && <BatteryPercent device={device} />}
        {row('UUID', id, () => navigate({ pathname: '/device-setting/factory-info', search: location.search }))}
        {caps.includes('face') && (!isAppHome || native?.peripheral?.radar !== undefined) && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 2 }}>
              <Typography sx={{ flexShrink: 0 }}>{t('accessCtl.auth.radarDetectionDistance')}</Typography>
              <LockSettingsSlider
                min={0}
                max={100}
                value={distance}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${t('peripheral.distance')} ${value}cm`}
                aria-label={t('accessCtl.auth.radarDetectionDistance')}
                disabled={isAppHome && !native?.bleConnected}
                onChange={(_, value) => {
                  trackingRadar.current = true;
                  if (value !== distance && isAppHome) deviceService.notify('haptic');
                  setDistance(value);
                }}
                onChangeCommitted={(_, value) => {
                  trackingRadar.current = false;
                  run('radar', { value: radarValue(model, value), command: radarCommand(model) });
                }}
              />
            </Box>
            <Typography sx={{ px: 2, pb: 2, fontSize: 13, color: 'text.secondary', whiteSpace: 'pre-line' }}>
              {t('peripheral.radarDescription')}
            </Typography>
          </Box>
        )}
        {sleeping && (
          <Typography sx={{ p: 2, color: 'text.secondary', fontSize: 13, whiteSpace: 'pre-line' }}>
            {t('peripheral.sleeping', {
              device: t(model === 'remote_nano' ? 'peripheral.nanoName' : 'peripheral.openSensorName'),
            })}
          </Typography>
        )}
        {pcConnector && (
          <>
            <Typography sx={{ bgcolor: 'secondary.main', color: 'text.secondary', px: 2, pt: 4, pb: 1, fontSize: 13 }}>
              {t('peripheral.boundDevicesHint', { device: title })}
            </Typography>
            <Box sx={{ px: 2 }}>
              <MobileBindDevice device={device} editable={false} />
            </Box>
          </>
        )}
        {!pcConnector && !isBike(model) && !sleeping && (
          <>
            <Typography sx={{ bgcolor: 'secondary.main', color: 'text.secondary', px: 2, pt: 4, pb: 1, fontSize: 13 }}>
              {t(wifi ? 'peripheral.wifiBindHint' : 'peripheral.bindHint', { device: title })}
            </Typography>
            {bound.map((target) => (
              <ListItem key={target}>
                <ListItemText
                  primary={
                    gManageDevice.companyDevices.find((d) => d.deviceUUID?.toUpperCase() === target.toUpperCase())
                      ?.deviceName || target
                  }
                />
                <IconButton
                  disabled={busy}
                  aria-label={t('peripheral.removeBinding')}
                  onClick={() => run('unbind', { target })}
                >
                  <DeleteOutline />
                </IconButton>
              </ListItem>
            ))}
            <ListItem
              onClick={() => {
                if (available()) setBindOpen(true);
              }}
              sx={{ cursor: 'pointer', minHeight: 53, gap: 1 }}
            >
              <Typography>{t('peripheral.addDevice')}</Typography>
              {!bound.length && <Error color="error" sx={{ fontSize: 22 }} />}
            </ListItem>
          </>
        )}
        <Box sx={{ bgcolor: 'secondary.main', height: 10 }} />
        <MobileRemoveDevice deviceUUID={id} subUUID={gStripe.customerInfo.subUUID} deviceName={title} named />
        {!wifi && !sleeping && (
          <LockSettingsExtras
            deviceUUID={id}
            autoUnlock={false}
            showPreferences={isBike(model)}
            settingsAction="peripheralSettings"
          />
        )}
      </List>
      {wifiOpen && <AppHubWifi connectAfterPassword deviceUUID={id} onClose={() => setWifiOpen(false)} />}
      <Drawer
        anchor="bottom"
        open={bindOpen}
        onClose={() => setBindOpen(false)}
        PaperProps={{
          sx: {
            height: '65dvh',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            overflow: 'hidden',
            pb: 'env(safe-area-inset-bottom)',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, bgcolor: 'background.paper' }}>
          <IconButton
            aria-label={t('pages.ir.remote.cancel')}
            onClick={() => setBindOpen(false)}
            sx={{ width: 48, height: 48 }}
          >
            <Close />
          </IconButton>
        </Box>
        <List sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {targets.length === 0 && (
            <ListItem>
              <ListItemText primary={t('peripheral.noDevices')} />
            </ListItem>
          )}
          {targets.map((target) => (
            <ListItem
              key={target.deviceUUID}
              aria-busy={bindingTarget === target.deviceUUID}
              onClick={async () => {
                if (busy || bindingTarget) return;
                setBindingTarget(target.deviceUUID);
                try {
                  if (await run('bind', { target: target.deviceUUID })) setBindOpen(false);
                } finally {
                  setBindingTarget(null);
                }
              }}
            >
              <ListItemText primary={target.deviceName || target.deviceModel} sx={{ flex: '0 1 auto' }} />
              {bindingTarget === target.deviceUUID && <CircularProgress size={18} sx={{ ml: '3px', flexShrink: 0 }} />}
            </ListItem>
          ))}
        </List>
      </Drawer>
    </Box>
  );
}
