import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isAndroidShell } from '@/services/appBridge';
import { prepareAppSession } from '@/services/appSession';
import AppOfflineDevices, { AppOfflineStateContext } from './AppOfflineDevices';

export default function AppBootstrap({ children }) {
  const location = useLocation();
  const [ready, setReady] = useState(!isAndroidShell);
  const [devices, setDevices] = useState(null);
  const localState = useMemo(() => ({ devices, setDevices }), [devices]);
  const [connecting, setConnecting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (ready || !navigator.onLine) return;
    let active = true;
    setConnecting(true);
    prepareAppSession()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setConnecting(false);
      });
    return () => {
      active = false;
    };
  }, [ready, attempt]);
  // Non-device routes must also reconnect without rendering the device-list fallback.
  useEffect(() => {
    if (ready || connecting || location.pathname === '/') return;
    const reconnect = () => {
      if (navigator.onLine && !document.hidden) setAttempt((value) => value + 1);
    };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', reconnect);
    const timer = window.setInterval(reconnect, 15000);
    return () => {
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', reconnect);
      window.clearInterval(timer);
    };
  }, [ready, connecting, location.pathname]);
  return (
    <AppOfflineStateContext.Provider value={localState}>
      {ready ? (
        children
      ) : location.pathname === '/' ? (
        <AppOfflineDevices retry={() => setAttempt((value) => value + 1)} connecting={connecting} />
      ) : null}
    </AppOfflineStateContext.Provider>
  );
}
