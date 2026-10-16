export const appTabPaths = ['/', '/vision', '/contacts', '/me/homepage'];
// App routes that draw their own header; the native toolbar hides on them.
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
export function appRouteInfo(path) {
  return { path, tab: appTabPaths.includes(path), pageHeader: appPageHeaderPaths.includes(path) };
}
const tabKey = 'sesame.activeTab';
export function currentAppTab() {
  const path = sessionStorage.getItem(tabKey);
  return appTabPaths.includes(path) ? path : '/';
}
export function rememberAppTab(path) {
  if (appTabPaths.includes(path)) sessionStorage.setItem(tabKey, path);
}
