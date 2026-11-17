import { useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { deviceService, isAppHome } from '@/services/deviceService';
import { rememberBleSnapshot } from '@/services/bleSnapshot';
import { useAppOnlyNotice, useBleSnapshot } from './useBleSnapshot';

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
  const { gManageDevice } = useContext(GlobalStateContext);
  const cloud = useBleSnapshot(isAppHome ? null : deviceUUID);
  const appOnly = useAppOnlyNotice();
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
          rememberBleSnapshot(deviceUUID, 'settings', data);
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
        rememberBleSnapshot(deviceUUID, 'settings', data);
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
  if (!isAppHome) {
    const device = gManageDevice.companyDevices.find(
      (item) => item.deviceUUID?.toUpperCase() === deviceUUID.toUpperCase()
    );
    const position =
      device?.stateInfo?.wm2State === true && Number.isFinite(device.stateInfo.position)
        ? Math.round((device.stateInfo.position * 360) / 1024)
        : undefined;
    return {
      settings: { ...cloud?.settings, position },
      connected: true,
      busy: false,
      error: false,
      readFailed: false,
      readOnly: true,
      command: async () => {
        appOnly();
        return null;
      },
      retryRead: () => {},
    };
  }
  return { settings, connected, busy, error, readFailed, command, retryRead: () => setRefresh((n) => n + 1) };
}
