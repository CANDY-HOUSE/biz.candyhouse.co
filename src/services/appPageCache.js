import { isAndroidShell } from './appBridge';

// Install only inside the Android shell. The first successful visit warms the next cold start.
export function registerAppPageCache() {
  if (!isAndroidShell || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('/app-worker.js', { updateViaCache: 'none' })
    .then(async () => {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'CACHE_APP_SHELL',
        resources: performance.getEntriesByType('resource').map((entry) => entry.name),
      });
    })
    .catch(() => {
      // Storage restrictions or unsupported WebViews must not block online startup.
    });
}
