import { createContext, useContext } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '@/routes/manifest';

// Settings pages that open inside the PC detail panel's column instead of their own route.
export const settingsSubPagePaths = [
  PATHS.deviceSetting.user,
  PATHS.deviceSetting.rename,
  PATHS.deviceSetting.share,
  PATHS.deviceSetting.batteryTrend,
  PATHS.deviceSetting.factoryInfo,
  PATHS.hub.ssmUpgrade,
  PATHS.accessControl.cards,
  PATHS.accessControl.passwords,
  PATHS.accessControl.passwordDetails,
  PATHS.cards.details,
  PATHS.deviceSetting.angle,
  PATHS.deviceSetting.botScript,
  PATHS.deviceSetting.credentials,
];

export const SettingsSubPageContext = createContext(null);

export function useSettingsNavigate() {
  const subPage = useContext(SettingsSubPageContext);
  const navigate = useNavigate();
  return (to, options) => {
    const [pathname, search = ''] =
      typeof to === 'string' ? to.split('?') : [to.pathname, (to.search || '').replace(/^\?/, '')];
    if (subPage && settingsSubPagePaths.includes(pathname)) subPage.open(pathname, search, options?.state);
    else navigate(to, options);
  };
}

export function useSettingsBack() {
  const subPage = useContext(SettingsSubPageContext);
  const navigate = useNavigate();
  return subPage?.page ? subPage.close : () => navigate(-1);
}

// A page opened in the column reads the query and state it was opened with, not the list page's URL.
export function useSettingsSearchParams() {
  const subPage = useContext(SettingsSubPageContext);
  const router = useSearchParams();
  return subPage?.page ? [subPage.page.params, subPage.replaceParams] : router;
}

export function useSettingsLocationState() {
  const subPage = useContext(SettingsSubPageContext);
  const location = useLocation();
  return (subPage?.page ? subPage.page.state : location.state) || {};
}
