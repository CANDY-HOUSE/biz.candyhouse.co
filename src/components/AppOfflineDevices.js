import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, ThemeProvider, Typography } from '@mui/material';
import { onNativeEvent, requestNative } from '@/services/appBridge';
import theme from '@/theme/theme';
import SesameDeviceList from './personal/SesameDeviceList';
import { deviceService } from '@/services/deviceService';
import { logOperationFailure } from '@/services/operationFailure';

// Share only within this bootstrap lifetime, so session initialization does not clear the local list.
export const AppOfflineStateContext = createContext(null);

// This screen has no cloud session and sends no cloud commands or pending uploads.
export default function AppOfflineDevices({ retry, connecting }) {
  const { t, i18n } = useTranslation();
  const retryRef = useRef(retry);
  const connectingRef = useRef(connecting);
  retryRef.current = retry;
  connectingRef.current = connecting;
  useEffect(() => {
    let retrying = false;
    const reconnect = async () => {
      if (!navigator.onLine || document.hidden || connectingRef.current || retrying) return;
      retrying = true;
      try {
        await retryRef.current();
      } catch (_) {
        logOperationFailure('AppOfflineDevices', 'reconnect');
      } finally {
        retrying = false;
      }
    };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', reconnect);
    const off = onNativeEvent(({ type }) => {
      if (type === 'resume') reconnect();
    });
    const timer = window.setInterval(reconnect, 15000);
    return () => {
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', reconnect);
      window.clearInterval(timer);
      off();
    };
  }, []);
  const { devices, setDevices } = useContext(AppOfflineStateContext);
  const [search, setSearch] = useState('');
  const visibleDevices = useMemo(
    () =>
      (devices || [])
        .filter((device) => device.deviceName?.includes(search))
        .map((device) => ({
          ...device,
          stateInfo: { wm2State: false },
        })),
    [devices, search]
  );
  useEffect(() => {
    let active = true;
    const refreshDevices = () =>
      requestNative('offlineDevices')
        .then(({ data }) => {
          if (!active) return;
          setDevices(data.devices);
          if (data.language) {
            const language = /^zh(?:-|$)/i.test(data.language)
              ? /-(?:Hant|TW|HK|MO)(?:-|$)/i.test(data.language)
                ? 'zh-TW'
                : 'zh-CN'
              : data.language;
            i18n.changeLanguage(language);
          }
        })
        .catch(() => {
          if (active) logOperationFailure('AppOfflineDevices', 'loadDevices');
        });
    const off = onNativeEvent(({ type, data }) => {
      if (type === 'resume') refreshDevices();
      if (type === 'snapshot') deviceService.receiveSnapshot(data);
    });
    refreshDevices();
    return () => {
      active = false;
      off();
    };
  }, [i18n, setDevices]);
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
        <SesameDeviceList devices={visibleDevices} callSearch={setSearch} localOnly />
        {devices?.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: '20px',
              pointerEvents: 'none',
            }}
          >
            <Typography
              sx={{ color: 'text.secondary', textAlign: 'center', fontSize: 17, fontWeight: 600, maxWidth: '32rem' }}
            >
              {t('appHome.noDevices')}
            </Typography>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
