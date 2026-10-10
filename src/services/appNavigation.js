export const appTabPaths = ['/', '/vision', '/contacts', '/me/homepage'];
const tabKey = 'sesame.activeTab';
export function currentAppTab() {
  const path = sessionStorage.getItem(tabKey);
  return appTabPaths.includes(path) ? path : '/';
}
export function rememberAppTab(path) {
  if (appTabPaths.includes(path)) sessionStorage.setItem(tabKey, path);
}
