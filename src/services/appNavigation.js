import { ios } from '@/theme/appHomeStyle';
import { PATHS, routeOf } from '@/routes/manifest';
export const appTabPaths = [PATHS.root, PATHS.vision, PATHS.contacts, PATHS.meHomepage];
// Height of the Biz-drawn app header row, part of the page viewport.
export const appTopBarHeight = 48;
export const appTabTopBarHeight = 52;
export const appTabBarHeight = 80;
export const appPageBackground = ios.background;
// AppFrame marks itself with these: the tab header and search slide away while the user scrolls down a tab page,
// and turn translucent once content scrolls under them.
export const appHeaderHidden = '[data-app-header="hidden"] &';
const appHeaderDocked = '[data-app-docked="true"] &';
const appHeaderSlide = {
  bgcolor: ios.background,
  transition: `transform 0.3s ${ios.spring}, background-color 0.2s ease`,
  [appHeaderDocked]: {
    bgcolor: 'rgba(242,242,247,0.2)',
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',
  },
};
export const appTabHeaderSx = { ...appHeaderSlide, [appHeaderHidden]: { transform: 'translateY(-100%)' } };
// Stays under the tab header while scrolling, leaving with it. The offset counts from inside the content box's
// top padding, which already reserves the header.
export const appStickySearchSx = {
  ...appHeaderSlide,
  position: 'sticky',
  top: 0,
  zIndex: 2,
  px: '16px',
  pt: '4px',
  pb: '8px',
  [appHeaderHidden]: { transform: `translateY(calc(-100% - ${appTabTopBarHeight}px))` },
};
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
    pageHeader: !!routeOf(path)?.appHeader,
    modal: layers.length > 0,
  };
}
const tabKey = 'sesame.activeTab';
export function currentAppTab() {
  const path = sessionStorage.getItem(tabKey);
  return appTabPaths.includes(path) ? path : PATHS.root;
}
export function rememberAppTab(path) {
  if (appTabPaths.includes(path)) sessionStorage.setItem(tabKey, path);
}
