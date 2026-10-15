import WebSocketManager, { WS_STATUS } from '@/websocket/WebSocketManager.ts';
import { onNativeEvent } from './appBridge';
import { appBuildHash, appUpdateEnabled } from './appBuildVersion';

const action = 'biz3AppRelease';
let availableVersion = '';
let reloading = false;
const listeners = new Set();
const update = (version) => {
  if (availableVersion === version) return;
  availableVersion = version;
  listeners.forEach((listener) => listener());
};
export const appUpdate = {
  getSnapshot: () => availableVersion,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function applyAppUpdate(pathname) {
  if (!appUpdateEnabled || pathname !== '/me/homepage' || !availableVersion || !navigator.onLine || reloading) return;
  // If navigation falls back to the old offline shell, don't reload it endlessly.
  const attempt = `${appBuildHash}:${availableVersion}`;
  if (sessionStorage.getItem('sesame.appUpdateAttempt') === attempt) return;
  sessionStorage.setItem('sesame.appUpdateAttempt', attempt);
  reloading = true;
  window.location.reload();
}

export function watchAppUpdate() {
  if (!appUpdateEnabled) return { dispose() {} };
  let disposed = false;
  let paused = false;
  let latest = '';
  let checking;
  let releasePending = false;
  const visible = () => !paused && !document.hidden;
  const publish = () => {
    if (!disposed) update(visible() && navigator.onLine ? latest : '');
  };
  const check = () => {
    if (disposed || !visible() || !navigator.onLine) return;
    if (checking) return checking;
    checking = fetch('/version.json', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((version) => {
        if (!version || !/^[0-9a-f]{8,40}$/.test(version.gitHash)) return;
        latest = version.gitHash === appBuildHash ? '' : version.gitHash;
        publish();
      })
      .catch(() => {})
      .finally(() => {
        checking = null;
        // A deployment can finish while a resume check is still in flight.
        if (releasePending) {
          releasePending = false;
          check();
        }
      });
    return checking;
  };
  const onRelease = (message) => {
    // Shared cloud services can carry notifications for other Amplify branches.
    if (message.origin !== window.location.origin) return;
    if (checking) releasePending = true;
    else check();
  };
  const onVisibility = () => {
    publish();
    check();
  };
  WebSocketManager.subscribe(action, onRelease);
  const offStatus = WebSocketManager.onStatusChange((status) => {
    if (status === WS_STATUS.CONNECTED) check();
  });
  const offNative = onNativeEvent(({ type }) => {
    if (type === 'pause') {
      paused = true;
      publish();
    } else if (type === 'resume') {
      paused = false;
      onVisibility();
    }
  });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('offline', publish);
  check();
  return {
    dispose() {
      disposed = true;
      offStatus();
      offNative();
      WebSocketManager.unsubscribe(action, onRelease);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('offline', publish);
      update('');
    },
  };
}
