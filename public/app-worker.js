/* eslint-disable no-restricted-globals -- Service Worker APIs are exposed on self. */
// Public page assets only. Tokens, API responses and device keys never enter this cache.
const CACHE = 'sesame-app-shell-v1';
const SHELL = '/?appHome=1&fromType=app';
let warming;
const assetUrl = (value) => {
  const url = new URL(value, self.location.origin);
  return url.origin === self.location.origin && url.pathname.startsWith('/static/') && !url.pathname.endsWith('.map')
    ? url.href
    : null;
};
async function rememberShell(response, resources = []) {
  if (warming) return warming;
  warming = (async () => {
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return;
    const html = await response.clone().text();
    const required = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => assetUrl(match[1]))
      .filter(Boolean);
    let assets = resources.map(assetUrl).filter(Boolean);
    try {
      const manifest = await fetch('/asset-manifest.json', { cache: 'no-store' });
      const { files } = await manifest.json();
      assets = Object.values(files).map(assetUrl).filter(Boolean);
      // A deployment changed between HTML and manifest requests: keep the last complete shell.
      if (required.some((url) => !assets.includes(url))) return;
    } catch (_) {
      // The dev server has no manifest. Cache its loaded entry resources, never hot-update traffic.
    }
    assets = [...new Set([...required, ...assets])].filter((url) => !url.includes('.hot-update.'));
    if (!assets.length) return;
    const cache = await caches.open(CACHE);
    const responses = await Promise.all(
      assets.map(async (url) => {
        const asset = await fetch(url);
        const type = asset.headers.get('content-type') || '';
        if (
          !asset.ok ||
          (url.endsWith('.js') && !/javascript/i.test(type)) ||
          (url.endsWith('.css') && !/text\/css/i.test(type))
        )
          throw new Error('Incomplete page assets');
        return asset;
      })
    );
    await Promise.all(assets.map((url, index) => cache.put(url, responses[index])));
    // Publish the HTML only after its assets have been stored successfully.
    await cache.put(SHELL, response);
  })().finally(() => {
    warming = null;
  });
  return warming;
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_APP_SHELL') return;
  event.waitUntil(
    fetch(SHELL, { cache: 'no-store' })
      .then((response) => rememberShell(response, event.data.resources || []))
      .catch(() => {})
  );
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && url.searchParams.get('appHome') === '1') {
    // Keep the cached shell usable when the network hangs, as well as when it is disconnected.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const network = fetch(request, { cache: 'no-store', signal: controller.signal }).finally(() => clearTimeout(timer));
    event.waitUntil(network.then((response) => rememberShell(response.clone())).catch(() => {}));
    event.respondWith(
      network
        .then(async (response) => {
          if (response.ok) return response;
          return (await caches.match(SHELL, { cacheName: CACHE })) || response;
        })
        .catch(async () => (await caches.match(SHELL, { cacheName: CACHE })) || Response.error())
    );
  } else if (assetUrl(url.href) && !url.pathname.includes('.hot-update.')) {
    // Content hashes make production assets immutable. New HTML requests new asset URLs.
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        if (/\.[0-9a-f]{8,}\./i.test(url.pathname)) return (await cache.match(request)) || fetch(request);
        // Development entry names are mutable; never pin an old HMR bundle while online.
        try {
          return await fetch(request);
        } catch (_) {
          return (await cache.match(request)) || Response.error();
        }
      })
    );
  }
});
