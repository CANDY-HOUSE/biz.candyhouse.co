import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { deviceService, isAppHome } from '@/services/deviceService';

export default function usePeripheralSettings(deviceUUID, wifi = false) {
  const devices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const native = devices[deviceUUID?.toUpperCase()];
  const session = useMemo(() => `settings_${Date.now()}_${Math.random()}`, [deviceUUID]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isAppHome || !native || !deviceUUID) return;
    let active = true;
    let timer;
    const action = wifi ? 'hubSettings' : 'peripheralSettings';
    const watch = () =>
      deviceService
        .request(action, { deviceUUID, operation: 'watch', session })
        .then(() => {
          if (active) setReady(true);
        })
        .catch(() => {
          if (active) timer = setTimeout(watch, 1000);
        });
    watch();
    return () => {
      active = false;
      clearTimeout(timer);
      setReady(false);
      deviceService.notify(action, { deviceUUID, operation: 'unwatch', session });
    };
  }, [deviceUUID, !!native, session, wifi]);
  const request = (operation, extra = {}) =>
    deviceService.request('peripheralSettings', { deviceUUID, session, operation, ...extra });
  return { native, session, request, ready };
}
