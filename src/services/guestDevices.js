// Only migration metadata is persisted here; BLE secrets remain in native key storage.
const storageKey = 'appGuestDevices';
export const guestDevices = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
const save = (items) => localStorage.setItem(storageKey, JSON.stringify(items));

export function rememberGuestDevices(subUUID, devices) {
  if (!subUUID) return;
  const previous = guestDevices();
  save([
    ...previous.filter((item) => item.subUUID !== subUUID || item.target),
    ...devices
      .filter(
        (device) =>
          device.subUUID === subUUID &&
          !previous.some((item) => item.subUUID === subUUID && item.deviceUUID === device.deviceUUID && item.target)
      )
      .map(({ deviceUUID, deviceName, keyLevel, orderKey }) => ({
        subUUID,
        deviceUUID,
        deviceName,
        keyLevel,
        orderKey,
      })),
  ]);
}

export function rememberGuestDevice(subUUID, { deviceUUID, deviceName, keyLevel, orderKey }) {
  if (!subUUID) return;
  const previous = guestDevices();
  if (previous.some((item) => item.subUUID === subUUID && item.deviceUUID === deviceUUID)) return;
  save([...previous, { subUUID, deviceUUID, deviceName, keyLevel, orderKey }]);
}

export function claimGuestDevices(target) {
  save(guestDevices().map((item) => (item.target ? item : { ...item, target })));
}

export function forgetGuestDevice(item) {
  save(
    guestDevices().filter(
      (saved) => saved.subUUID !== item.subUUID || saved.deviceUUID !== item.deviceUUID || saved.target !== item.target
    )
  );
}

export function preserveGuestDevices(clear) {
  const saved = localStorage.getItem(storageKey);
  clear();
  if (saved) localStorage.setItem(storageKey, saved);
}
