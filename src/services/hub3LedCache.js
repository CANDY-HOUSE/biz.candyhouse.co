// Hub3 LED brightness can only be read over IoT, so the settings page shows the last value seen on this phone
// until the Hub answers. A fresh registration means a reset Hub, whose factory default is full brightness.
// localStorage throws in private mode or with storage disabled; fall back to full brightness.
const DEFAULT_LED_PERCENT = 100;
const storageKey = (deviceUUID) => `hub3.led.${String(deviceUUID || '').toUpperCase()}`;

export function loadHub3LedPercent(deviceUUID) {
  try {
    const saved = localStorage.getItem(storageKey(deviceUUID));
    if (saved !== null && Number.isFinite(Number(saved))) return Number(saved);
  } catch (_) {
    // Fall back to the default.
  }
  return DEFAULT_LED_PERCENT;
}

export function saveHub3LedPercent(deviceUUID, percent) {
  try {
    localStorage.setItem(storageKey(deviceUUID), String(percent));
  } catch (_) {
    // Only affects the initial display next time.
  }
}

export function forgetHub3LedPercent(deviceUUID) {
  try {
    localStorage.removeItem(storageKey(deviceUUID));
  } catch (_) {
    // Nothing cached.
  }
}
