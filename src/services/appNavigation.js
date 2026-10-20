export const appTabPaths = ['/', '/vision', '/contacts', '/me/homepage'];
// Height of the Biz-drawn app header row, part of the page viewport.
export const appTopBarHeight = 48;
// App routes that draw their own header; AppTopBar hides on them.
const appPageHeaderPaths = [
  '/device-setting',
  '/device-setting/rename',
  '/device-setting/angle',
  '/device-setting/auto-unlock',
  '/device-setting/bot-script',
  '/device-setting/credentials',
  '/biz/devices/list-item',
  '/device-history',
  '/biz/access-control/region',
  '/biz/wifi-module',
  '/biz/wifi-module/index',
];
// Open page layers (menu, QR scanner, sheets) close before system back leaves a page or the app.
const layers = [];
const layerListeners = new Set();
export function openAppLayer(close) {
  const layer = { close };
  layers.push(layer);
  layerListeners.forEach((listener) => listener());
  return () => {
    const index = layers.indexOf(layer);
    if (index < 0) return;
    layers.splice(index, 1);
    layerListeners.forEach((listener) => listener());
  };
}
export function closeTopAppLayer() {
  const layer = layers[layers.length - 1];
  if (!layer) return false;
  layer.close();
  return true;
}
export function onAppLayersChange(listener) {
  layerListeners.add(listener);
  return () => layerListeners.delete(listener);
}
export function appRouteInfo(path) {
  return {
    path,
    tab: appTabPaths.includes(path),
    pageHeader: appPageHeaderPaths.includes(path),
    modal: layers.length > 0,
  };
}
const tabKey = 'sesame.activeTab';
export function currentAppTab() {
  const path = sessionStorage.getItem(tabKey);
  return appTabPaths.includes(path) ? path : '/';
}
export function rememberAppTab(path) {
  if (appTabPaths.includes(path)) sessionStorage.setItem(tabKey, path);
}
