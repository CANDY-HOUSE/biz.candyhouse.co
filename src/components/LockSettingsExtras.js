import LockSettingsSlider from './LockSettingsSlider';
import { useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Box, Divider, Drawer, ListItem, ListItemText, Switch, Typography, SvgIcon } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { deviceService, isAppHome } from '@/services/deviceService';
import { isAndroidShell, onNativeEvent } from '@/services/appBridge';
import { SvgArrow } from '@/assets/svg/svgLock';
import { lockSettingsInteraction } from './lockSettingsInteraction';

export default function LockSettingsExtras({
  deviceUUID,
  autoUnlock = true,
  showPreferences = true,
  settingsAction = 'lockSettings',
}) {
  const { t } = useTranslation();
  const { setSnackbarValue } = useContext(GlobalStateContext);
  const navigate = useNavigate();
  const location = useLocation();
  const devices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const native = devices[deviceUUID.toUpperCase()];
  const [power, setPower] = useState(-4);
  const [preferences, setPreferences] = useState({});
  const [reset, setReset] = useState(false);
  const android = isAppHome && isAndroidShell && showPreferences;
  const error = () =>
    setSnackbarValue({
      logScope: 'components/LockSettingsExtras.error',
      logReason: 'lockSettings.failed',
      open: true,
      msg: t('lockSettings.failed'),
      severity: 'error',
    });
  const request = (operation, extra = {}) =>
    deviceService
      .request('devicePreferences', { deviceUUID, operation, ...extra })
      .then(({ data }) => setPreferences(data));
  useEffect(() => {
    setPower(native?.settings?.bleTxPower ?? -4);
  }, [deviceUUID, native?.settings?.bleTxPower]);
  useEffect(() => {
    if (!android) return;
    request('watchNfc').catch(error);
    const off = onNativeEvent(({ type, data }) => {
      if (type === 'devicePreferences') setPreferences(data);
      if (type === 'resume') request('read').catch(error);
    });
    return () => {
      off();
      deviceService.notify('devicePreferences', { deviceUUID, operation: 'stopNfc' });
    };
  }, [deviceUUID, android]);
  if (!isAppHome) return null;
  const divider = <Divider variant="middle" sx={{ opacity: 0.4 }} />;
  return (
    <Box sx={lockSettingsInteraction}>
      <Box sx={{ bgcolor: 'secondary.main', height: 500 }} />
      {isAppHome && native?.settings?.bleTxPower !== undefined && (
        <Box sx={{ px: 2, minHeight: 53, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ color: 'text.primary', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t('lockExtras.txPower')}
          </Typography>
          <LockSettingsSlider
            sx={{
              flex: 1,
              minWidth: 0,
              mr: 1,
            }}
            min={-4}
            max={20}
            step={1}
            value={power ?? -4}
            disabled={!native?.bleConnected}
            aria-label={t('lockExtras.txPower')}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value} dBm`}
            onChange={(_, value) => {
              if (value !== power) deviceService.notify('haptic');
              setPower(value);
            }}
            onChangeCommitted={(_, value) =>
              deviceService.request(settingsAction, { deviceUUID, operation: 'txPower', value }).catch(error)
            }
          />
        </Box>
      )}
      {android && (
        <>
          <Box sx={{ bgcolor: 'secondary.main', height: 500 }} />
          <ListItem onClick={() => preferences.nfc && setReset(true)}>
            <ListItemText primary="NFC" sx={{ flex: '0 0 auto', mr: 2 }} />
            <Typography
              sx={{ ml: 'auto', color: 'title.other', fontSize: 14, textAlign: 'right', overflowWrap: 'anywhere' }}
            >
              {preferences.nfc || t('lockExtras.nfcHint')}
            </Typography>
          </ListItem>
          {divider}
          <ListItem onClick={() => deviceService.request('notificationSettings').catch(error)}>
            <ListItemText
              primary={t('lockExtras.widget')}
              secondary={
                preferences.notificationsEnabled === false
                  ? t('lockExtras.notificationHint')
                  : t('lockExtras.notificationGranted')
              }
              secondaryTypographyProps={{
                sx: {
                  fontSize: 11,
                  color: preferences.notificationsEnabled === false ? 'error.main' : 'text.secondary',
                },
              }}
            />
            <Switch
              disableRipple
              checked={!!preferences.widget}
              onClick={(event) => event.stopPropagation()}
              onChange={(_, value) => request('widget', { value }).catch(error)}
            />
          </ListItem>
          {divider}
          {autoUnlock && (
            <>
              <ListItem onClick={() => navigate({ pathname: '/device-setting/auto-unlock', search: location.search })}>
                <ListItemText primary={t('lockExtras.autoUnlock')} />
                <Typography sx={{ color: 'title.other' }}>
                  {preferences.autoUnlock ? t('lockExtras.on') : t('lockSettings.off')}
                </Typography>
                <SvgIcon component={SvgArrow} />
              </ListItem>
              {divider}
            </>
          )}
          <Box sx={{ bgcolor: 'secondary.main', height: 48 }} />
          <Drawer anchor="bottom" open={reset} onClose={() => setReset(false)}>
            <ListItem
              onClick={() =>
                request('clearNfc')
                  .then(() => setReset(false))
                  .catch(error)
              }
              sx={{ justifyContent: 'center', color: 'error.main' }}
            >
              {t('lockExtras.nfcReset')}
            </ListItem>
            <ListItem onClick={() => setReset(false)} sx={{ justifyContent: 'center' }}>
              {t('deviceMember.opt.cancel')}
            </ListItem>
          </Drawer>
        </>
      )}
    </Box>
  );
}
