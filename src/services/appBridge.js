// No native object is exposed to iframes with either transport.
const appShells = [
  {
    marker: 'SesameAndroid/1',
    platform: 'android',
    transport: 'port',
    iotHistoryPrefix: '0010',
    distributesApk: true,
    alwaysLocationOption: 'lockExtras.allowAllTheTime',
  },
  { marker: 'SesameiOS/1', platform: 'ios', transport: 'scriptHandler', iotHistoryPrefix: '0011' },
];
const appShell = appShells.find(({ marker }) => navigator.userAgent.includes(marker));
export const isAppShell = Boolean(appShell);
export const appPlatform = appShell?.platform;
export const appIotHistoryPrefix = appShell?.iotHistoryPrefix;
export const appDistributesApk = appShell?.distributesApk === true;
export const appAlwaysLocationOption = appShell?.alwaysLocationOption ?? 'lockExtras.always';
const SCRIPT_HANDLER = 'sesameNative';
let send;
let sequence = 0;
const pending = new Map();
const listeners = new Set();
// Native may post 'navigate' (e.g. a tapped push opening /vision?deviceUUID=..) right after the
// bridge connects on cold start, before AppHomeRuntime has subscribed; listeners would drop it.
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
function receive(data) {
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
}
let port;
function receivePort(event) {
  if (event.data !== window.__sesamePortNonce || !window.__sesamePortNonce || event.ports.length !== 1) return;
  delete window.__sesamePortNonce;
  delete window.__sesamePendingBridgeEvent;
  port?.close();
  port = event.ports[0];
  port.onmessage = ({ data }) => receive(data);
  port.start();
  send = (text) => port.postMessage(text);
  connected();
}
if (appShell?.transport === 'port') {
  window.addEventListener('message', receivePort);
  // Native can deliver the port before the main bundle finishes loading.
  if (window.__sesamePendingBridgeEvent) receivePort(window.__sesamePendingBridgeEvent);
} else if (appShell?.transport === 'scriptHandler') {
  const queued = window.__sesameNativeEvents || [];
  const wasConnected = window.__sesameNativeConnected === true;
  delete window.__sesameNativeEvents;
  window.__sesameNativeReceive = receive;
  window.__sesameNativeConnect = () => {
    send = (text) => window.webkit?.messageHandlers?.[SCRIPT_HANDLER]?.postMessage(text);
    connected();
  };
  queued.forEach(receive);
  if (wasConnected) window.__sesameNativeConnect();
}
export function onNativeEvent(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function requestNative(action, payload = {}) {
  if (!isAppShell) return Promise.reject(new Error('Native bridge unavailable'));
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
      if (pending.has(requestId)) send(JSON.stringify({ action: `home.${action}`, requestId, ...payload }));
    });
  });
}
export function notifyNative(action, payload = {}) {
  if (send) send(JSON.stringify({ action: `home.${action}`, ...payload }));
}
