// A port delivered to the trusted top-level page; no Java interface is exposed to iframes.
export const isAndroidShell = navigator.userAgent.includes('SesameAndroid/1');
let port;
let sequence = 0;
const pending = new Map();
const listeners = new Set();
// Native may post 'navigate' (e.g. a tapped push opening /vision?deviceUUID=..) right after the
// port connects on cold start, before AppHomeRuntime has subscribed; listeners would drop it.
// Keep the latest one until the runtime takes it once, then stop holding.
let earlyNavigate = null;
let navigateReady = false;
export function takeEarlyNavigate() {
  navigateReady = true;
  const target = earlyNavigate;
  earlyNavigate = null;
  return target;
}
let connected;
const connection = new Promise((resolve) => {
  connected = resolve;
});
function receivePort(event) {
  if (
    !isAndroidShell ||
    event.data !== window.__sesamePortNonce ||
    !window.__sesamePortNonce ||
    event.ports.length !== 1
  )
    return;
  delete window.__sesamePortNonce;
  delete window.__sesamePendingBridgeEvent;
  port?.close();
  port = event.ports[0];
  port.onmessage = ({ data }) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (_) {
      return;
    }
    if (message.type === 'result') {
      const result = message.data;
      const request = pending.get(result.requestId);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(result.requestId);
      result.success ? request.resolve(result) : request.reject(new Error(result.error || 'Native operation failed'));
    } else {
      if (message.type === 'navigate' && !navigateReady) earlyNavigate = message.data;
      listeners.forEach((listener) => listener(message));
    }
  };
  port.start();
  connected();
}
window.addEventListener('message', receivePort);
// Android can deliver the port before the main bundle finishes loading.
if (window.__sesamePendingBridgeEvent) receivePort(window.__sesamePendingBridgeEvent);
export function onNativeEvent(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function requestNative(action, payload = {}) {
  if (!isAndroidShell) return Promise.reject(new Error('Native bridge unavailable'));
  return new Promise((resolve, reject) => {
    const requestId = `native_${++sequence}`;
    const timer = setTimeout(
      () => {
        pending.delete(requestId);
        reject(new Error('Native operation timed out'));
      },
      action === 'register' ? 90000 : 30000
    );
    pending.set(requestId, { resolve, reject, timer });
    connection.then(() => {
      if (pending.has(requestId)) port.postMessage(JSON.stringify({ action: `home.${action}`, requestId, ...payload }));
    });
  });
}
export function notifyNative(action, payload = {}) {
  if (port) port.postMessage(JSON.stringify({ action: `home.${action}`, ...payload }));
}
