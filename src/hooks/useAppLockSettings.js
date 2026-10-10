import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { deviceService } from '@/services/deviceService';

// Settings come from BLE snapshots. Firmware version is read separately after DFU.
export function useAppLockSettings(deviceUUID) {
  const devices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const native = devices[deviceUUID.toUpperCase()];
  const connected = native?.bleConnected === true;
  const cached = useRef({});
  const [read, setRead] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const pending = useRef(false);
  if (connected) cached.current = native.settings || {};
  const settings = { ...read, ...cached.current, ...native?.settings };
  // SS2's autolock value is queried; OS3 settings are supplied in the snapshot.
  if (settings.autoLockSeconds === undefined) settings.autoLockSeconds = read.autoLockSeconds;
  useEffect(() => {
    let active = true;
    setReadFailed(false);
    if (connected)
      deviceService
        .request('lockSettings', { deviceUUID, operation: 'read' })
        .then(({ data }) => {
          if (active) setRead(data);
        })
        .catch(() => {
          if (active) setReadFailed(true);
        });
    return () => {
      active = false;
    };
  }, [deviceUUID, connected, refresh]);
  const command = async (operation, value) => {
    if (pending.current || !connected) return null;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      const { data } = await deviceService.request(operation === 'toggle' ? 'command' : 'lockSettings', {
        deviceUUID,
        operation,
        value,
      });
      if (operation !== 'toggle') {
        cached.current = { ...cached.current, ...data };
        setRead((previous) => ({ ...previous, ...data }));
      }
      return data || {};
    } catch (_) {
      setError(true);
      return null;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { settings, connected, busy, error, readFailed, command, retryRead: () => setRefresh((n) => n + 1) };
}
