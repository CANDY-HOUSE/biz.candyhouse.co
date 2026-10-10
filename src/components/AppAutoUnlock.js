import BackButton from '@/components/BackButton';
import LockSettingsSlider from './LockSettingsSlider';
import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { Box, ListItem, ListItemText, Switch, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { deviceService } from '@/services/deviceService';
import { onNativeEvent } from '@/services/appBridge';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { lockSettingsInteraction } from './lockSettingsInteraction';

export default function AppAutoUnlock() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const deviceUUID = params.get('deviceUUID');
  const { setSnackbarValue } = useContext(GlobalStateContext);
  const map = useRef();
  const mapTouchArea = useRef();
  const active = useRef(false);
  const [preferences, setPreferences] = useState({ radius: 150, autoUnlock: false });
  const error = () => {
    if (active.current)
      setSnackbarValue({
        logScope: 'components/AppAutoUnlock.error',
        logReason: 'lockSettings.failed',
        open: true,
        msg: t('lockSettings.failed'),
        severity: 'error',
      });
  };
  const request = (operation, data = {}) =>
    deviceService.request('autoUnlockMap', { deviceUUID, operation, ...data }).then(({ data }) => {
      if (active.current) setPreferences(data);
    });
  useLayoutEffect(() => {
    active.current = true;
    const element = map.current;
    const touchElement = mapTouchArea.current;
    // Only this route reveals the native map below WebView. Restore every ancestor on exit.
    const backgrounds = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      backgrounds.push([parent, parent.style.backgroundColor]);
      parent.style.backgroundColor = 'transparent';
    }
    const rect = (node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { left: x, top: y, width, height };
    };
    const layout = () => {
      // ResizeObserver may deliver a queued callback after React detaches the route's ref.
      if (!active.current || map.current !== element || !element.isConnected) return;
      const bounds = rect(element);
      if (!bounds.width || !bounds.height) return;
      request('open', { rect: bounds, touchRect: rect(touchElement) }).catch(error);
    };
    const observer = new ResizeObserver(layout);
    observer.observe(element);
    observer.observe(touchElement);
    const off = onNativeEvent(({ type, data }) => {
      if (type === 'devicePreferences') setPreferences(data);
    });
    return () => {
      active.current = false;
      observer.disconnect();
      off();
      backgrounds.forEach(([parent, background]) => {
        parent.style.backgroundColor = background;
      });
      deviceService.notify('autoUnlockMap', { operation: 'close' });
    };
  }, [deviceUUID]);
  return (
    <Box sx={{ ...lockSettingsInteraction, height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 48, flexShrink: 0, bgcolor: 'background.paper' }}>
        <BackButton disableRipple onClick={() => navigate(-1)}></BackButton>
      </Box>
      <ListItem sx={{ bgcolor: 'background.paper', flexShrink: 0 }}>
        <ListItemText primary={t('lockExtras.autoUnlock')} />
        <Switch
          disableRipple
          checked={preferences.autoUnlock}
          onChange={(_, value) => request('enable', { value }).catch(error)}
        />
      </ListItem>
      <Box ref={map} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'transparent' }}>
        <Typography
          sx={{
            px: 2,
            py: 1,
            color: 'text.secondary',
            bgcolor: 'transparent',
            fontSize: 14,
            whiteSpace: 'pre-line',
            maxHeight: '30vh',
            overflow: 'auto',
            flexShrink: 0,
          }}
        >
          {t('lockExtras.autoHint')}
        </Typography>
        <Box ref={mapTouchArea} sx={{ flex: 1, minHeight: 0 }} />
        <Box sx={{ px: 3, pt: 2, pb: 5, flexShrink: 0, bgcolor: 'transparent' }}>
          <LockSettingsSlider
            sx={{
              color: '#d77e80',
            }}
            aria-label={t('lockExtras.radius', { value: preferences.radius })}
            min={20}
            max={500}
            step={0.1}
            value={preferences.radius}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => Number(value.toFixed(1))}
            onChange={(_, radius) => {
              setPreferences((old) => ({ ...old, radius }));
              deviceService.notify('autoUnlockMap', { deviceUUID, operation: 'region', radius });
            }}
            onChangeCommitted={(_, radius) => request('region', { radius, commit: true }).catch(error)}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#d77e80' }}>
            <Typography>20 m</Typography>
            <Typography>500 m</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
