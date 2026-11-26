import LockSettingsSlider from './LockSettingsSlider';
import { useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Box, Divider, Drawer, ListItem, ListItemText, Switch, Typography, SvgIcon } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { deviceService, isAppHome } from '@/services/deviceService';
import { isAppShell, onNativeEvent } from '@/services/appBridge';
import { appHostSupports } from '@/services/appSession';
import { SvgArrow } from '@/assets/svg/svgLock';
import { useAppOnlyNotice, useBleSnapshot } from '@/hooks/useBleSnapshot';
import { lockSettingsInteraction } from './lockSettingsInteraction';
import { PATHS } from '@/routes/manifest';

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
  const cloud = useBleSnapshot(isAppHome ? null : deviceUUID);
  const appOnly = useAppOnlyNotice();
  const txPower = isAppHome ? native?.settings?.bleTxPower : cloud?.settings?.bleTxPower;
  const [power, setPower] = useState(-4);
  const [preferences, setPreferences] = useState({});
  const [reset, setReset] = useState(false);
  const nativePreferences = isAppHome && isAppShell && showPreferences;
  const nfc = nativePreferences && appHostSupports('nfc');
  const widget = nativePreferences && appHostSupports('widget');
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
    setPower(txPower ?? -4);
  }, [deviceUUID, txPower]);
  useEffect(() => {
    if (!nativePreferences) return;
    request(nfc ? 'watchNfc' : 'read').catch(error);
    const off = onNativeEvent(({ type, data }) => {
      if (type === 'devicePreferences') setPreferences(data);
      if (type === 'resume') request('read').catch(error);
    });
    return () => {
      off();
      if (nfc) deviceService.notify('devicePreferences', { deviceUUID, operation: 'stopNfc' });
    };
  }, [deviceUUID, nativePreferences, nfc]);
  if (!isAppHome && txPower === undefined) return null;
  const divider = <Divider variant="middle" sx={{ opacity: 0.4 }} />;
  return (
    <Box sx={lockSettingsInteraction}>
      <Box sx={{ bgcolor: 'secondary.main', height: 500 }} />
      {txPower !== undefined && (
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
            disabled={isAppHome && !native?.bleConnected}
            aria-label={t('lockExtras.txPower')}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value} dBm`}
            onChange={(_, value) => {
              if (!isAppHome) return;
              if (value !== power) deviceService.notify('haptic');
              setPower(value);
            }}
            onChangeCommitted={(_, value) =>
              isAppHome
                ? deviceService.request(settingsAction, { deviceUUID, operation: 'txPower', value }).catch(error)
                : appOnly()
            }
          />
        </Box>
      )}
      {nativePreferences && (
        <>
          <Box sx={{ bgcolor: 'secondary.main', height: 500 }} />
          {nfc && (
            <>
              <ListItem onClick={() => preferences.nfc && setReset(true)}>
                <ListItemText primary="NFC" sx={{ flex: '0 0 auto', mr: 2 }} />
                <Typography
                  sx={{ ml: 'auto', color: 'title.other', fontSize: 14, textAlign: 'right', overflowWrap: 'anywhere' }}
                >
                  {preferences.nfc || t('lockExtras.nfcHint')}
                </Typography>
              </ListItem>
              {divider}
            </>
          )}
          {widget && (
            <>
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
            </>
          )}
          {autoUnlock && (
            <>
              <ListItem onClick={() => navigate({ pathname: PATHS.deviceSetting.autoUnlock, search: location.search })}>
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
