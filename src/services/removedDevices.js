// Devices the owner removed from this phone without a physical reset. They still advertise as registered,
// so the registration page lists them greyed out. Kept per phone, across sign-in and sign-out.
const storageKey = 'appRemovedDevices';
export const removedDevices = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch (_) {
    return [];
  }
};
const save = (items) => localStorage.setItem(storageKey, JSON.stringify(items));

export function rememberRemovedDevice(deviceUUID) {
  const id = deviceUUID.toUpperCase();
  if (!removedDevices().includes(id)) save([...removedDevices(), id]);
}

export function forgetRemovedDevice(deviceUUID) {
  const id = deviceUUID.toUpperCase();
  save(removedDevices().filter((item) => item !== id));
}

export function preserveRemovedDevices(clear) {
  const saved = localStorage.getItem(storageKey);
  clear();
  if (saved) localStorage.setItem(storageKey, saved);
}
