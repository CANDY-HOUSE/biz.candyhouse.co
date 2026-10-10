import { isAndroidShell, requestNative, notifyNative } from './appBridge';

// Captured once per document; client-side navigation must not change the runtime mode.
// The host UA survives navigation and reloads even when a route drops the entry query.
export const isAppHome = isAndroidShell || new URLSearchParams(window.location.search).get('appHome') === '1';
let snapshot = {};
const listeners = new Set();
const discoveryListeners = new Set();

export const deviceService = {
  onDiscovery(listener) {
    discoveryListeners.add(listener);
    return () => discoveryListeners.delete(listener);
  },
  receiveDiscovery(data) {
    discoveryListeners.forEach((listener) => listener(data));
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => snapshot,
  receiveSnapshot(devices) {
    snapshot = Object.fromEntries(devices.map((device) => [device.deviceUUID.toUpperCase(), device]));
    listeners.forEach((listener) => listener());
  },
  request(action, payload = {}) {
    return isAndroidShell ? requestNative(action, payload) : Promise.reject(new Error('Native bridge unavailable'));
  },
  notify(action, payload = {}) {
    notifyNative(action, payload);
  },
};
