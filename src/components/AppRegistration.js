import { bleStateLabel } from '@/services/blePresentation';
import { isPeripheralModel } from '@/services/peripheralSettings';
import { initializeBotScripts, isScriptBotModel } from '@/services/botScripts';
import { rememberGuestDevice } from '@/services/guestDevices';
import { isAppLockModel } from '@/services/appLockSettings';
import { isGuestAppSession } from '@/services/appSession';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useRef, useState } from 'react';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { cloudCallback } from '@/services/cloudCallback';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, List, ListItemButton, Divider, Stack, Typography } from '@mui/material';
import { Bluetooth, BluetoothConnected, BluetoothDisabled } from '@mui/icons-material';
import { deviceService } from '@/services/deviceService';
import BleStatusBar from './BleStatusBar';

export default function AppRegistration() {
  const { t } = useTranslation();
  const { gManageDevice, gStripe } = useContext(GlobalStateContext);
  const navigate = useNavigate();
  const active = useRef(false);
  const pullStart = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [discovery, setDiscovery] = useState({ devices: [] });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const start = async () => {
    setError('');
    setRefreshing(true);
    try {
      await deviceService.request('scanStart');
    } catch (e) {
      if (active.current) setError(e.message);
    } finally {
      if (active.current) setRefreshing(false);
    }
  };
  useEffect(() => {
    active.current = true;
    const unsubscribe = deviceService.onDiscovery(setDiscovery);
    start();
    return () => {
      active.current = false;
      unsubscribe();
      deviceService.notify('scanStop');
    };
  }, []);
  const register = async (device) => {
    setBusy(device.deviceUUID);
    setError('');
    try {
      const result = await deviceService.request('register', { deviceUUID: device.deviceUUID });
      await cloudCallback((cb) => gManageDevice.addSesameDevicesToBiz3([result.data], cb));
      if (isGuestAppSession() && gStripe.customerInfo.isAnonymous)
        rememberGuestDevice(gStripe.customerInfo.subUUID, result.data);
      await deviceService.request('keysUploaded', { deviceUUID: device.deviceUUID });
      if (isScriptBotModel(result.data.deviceModel)) {
        await deviceService.request('scripts', { deviceUUID: device.deviceUUID });
        await initializeBotScripts(device.deviceUUID, [], 0, true);
      }
      gManageDevice.getCompanyDevices(true);
      if (active.current) {
        navigate('/?appHome=1&fromType=app', { replace: true });
        const isHub = ['hub_3', 'hub_3_pro'].includes(result.data.deviceModel);
        if (isAppLockModel(result.data.deviceModel) || isHub || isPeripheralModel(result.data.deviceModel)) {
          const params = new URLSearchParams({
            appHome: '1',
            fromType: 'app',
            deviceUUID: device.deviceUUID,
            deviceModel: result.data.deviceModel,
            keyLevel: '0',
            setup: '1',
          });
          navigate({
            pathname: isHub
              ? '/biz/wifi-module/index'
              : isPeripheralModel(result.data.deviceModel)
                ? '/device-setting'
                : '/device-setting/angle',
            search: params.toString(),
          });
        }
      }
    } catch (e) {
      if (active.current) setError(e.message);
    } finally {
      if (active.current) setBusy('');
    }
  };
  return (
    <Box
      sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', touchAction: 'pan-y' }}
      onTouchStart={(event) => {
        pullStart.current = window.scrollY === 0 ? event.touches[0].clientY : null;
      }}
      onTouchEnd={(event) => {
        if (
          pullStart.current !== null &&
          event.changedTouches[0].clientY - pullStart.current > 70 &&
          !busy &&
          !refreshing
        )
          start();
        pullStart.current = null;
      }}
    >
      {refreshing && <CircularProgress size={20} />}
      {(error || discovery.error) && <Alert severity="error">{error || discovery.error}</Alert>}
      <BleStatusBar bluetoothOff={discovery.bluetoothOff} />
      <List sx={{ px: 2, display: discovery.devices.length ? 'block' : 'none' }}>
        {discovery.devices.map((device) => {
          const connected = ['readyToRegister', 'bleConnecting', 'waitingGatt', 'bleLogining', 'registering'].includes(
            device.bleState
          );
          const Icon = discovery.bluetoothOff ? BluetoothDisabled : connected ? BluetoothConnected : Bluetooth;
          const distance = Number.isFinite(device.rssi) ? Math.floor(10 ** ((-device.rssi - 62) / 20) * 100) : null;
          return (
            <Box key={device.deviceUUID}>
              <ListItemButton
                disabled={Boolean(busy)}
                onClick={() => register(device)}
                sx={{ py: 3, px: 0, display: 'block' }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography sx={{ fontSize: 22, fontWeight: 600 }}>{device.name}</Typography>
                  <Stack direction="row" alignItems="center" sx={{ color: 'primary.main', whiteSpace: 'nowrap' }}>
                    <Typography variant="caption">{distance === null ? '' : `${distance} cm`}</Typography>
                    <Icon fontSize="small" />
                  </Stack>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mt: 1, color: 'text.disabled' }}
                >
                  <Typography sx={{ fontSize: 10, overflowWrap: 'anywhere' }}>{device.deviceUUID}</Typography>
                  <Typography sx={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                    {bleStateLabel(device.bleState, t)}
                  </Typography>
                </Stack>
                {busy === device.deviceUUID && <CircularProgress size={24} />}
              </ListItemButton>
              <Divider />
            </Box>
          );
        })}
      </List>
      {!discovery.devices.length && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 2, py: 3 }}>
          <Typography sx={{ textAlign: 'center', fontSize: 17, mb: '20px', color: '#000' }}>
            {t('appHome.noBleDevices')}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-line', fontSize: 12, lineHeight: '22px', color: '#ccc' }}>
            {t('appHome.noBleDevicesDescription')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
