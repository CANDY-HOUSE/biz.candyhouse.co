import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import AppRefreshIndicator from './AppRefreshIndicator';
import { appTabPaths } from '@/services/appNavigation';
import { cancelPullRefreshEvent } from '@/services/appPullRefresh';
import { refreshAppDevices } from '@/services/appDeviceRefresh';
import { refreshOtherAppTab } from '@/services/appTabRefresh';
import { GlobalStateContext } from '@/context/GlobalContextProvider';

export default function AppPullRefresh() {
  const { pathname } = useLocation();
  const threshold = appTabPaths.includes(pathname) ? 90 : 70;
  const { t } = useTranslation();
  const { gStripe, setSnackbarValue } = useContext(GlobalStateContext);
  const companyID = gStripe.customerInfo.companyID;
  const isAnonymous = gStripe.customerInfo.isAnonymous;
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    setDistance(0);
    setRefreshing(false);
    const hubPage = ['/biz/wifi-module', '/biz/wifi-module/index'].includes(pathname);
    if (!hubPage && !appTabPaths.includes(pathname)) return;
    let start = null;
    let pull = 0;
    let frame = null;
    let pending = false;
    const controller = new AbortController();
    const showDistance = (value) => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        setDistance(value);
      });
    };
    const reset = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      start = null;
      pull = 0;
      setDistance(0);
    };
    const begin = (event) => {
      reset();
      if (
        pending ||
        event.touches.length !== 1 ||
        event.target.closest(
          'input, textarea, .MuiModal-root, [role="dialog"], [role="slider"], [data-refresh-disabled="true"]'
        )
      )
        return;
      for (let node = event.target; node instanceof Element; node = node.parentElement) {
        if (node.scrollTop > 0) return;
      }
      if (window.scrollY > 0) return;
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const move = (event) => {
      if (event.touches.length !== 1 || event.defaultPrevented) {
        reset();
        return;
      }
      if (!start) return;
      const dy = event.touches[0].clientY - start.y;
      const dx = Math.abs(event.touches[0].clientX - start.x);
      if (dy < 0 || dx > Math.max(12, dy)) {
        reset();
        return;
      }
      pull = Math.min(dy, threshold + 30);
      if (pull > 12) {
        if (event.cancelable) event.preventDefault();
        showDistance(pull);
      } else {
        showDistance(0);
      }
    };
    const end = async () => {
      const refresh = pull >= threshold;
      reset();
      if (refresh) {
        pending = true;
        setRefreshing(true);
        if (hubPage) {
          window.location.reload();
          return;
        }
        try {
          if (pathname === '/') await refreshAppDevices(companyID, controller.signal);
          else await refreshOtherAppTab(pathname, { companyID, isAnonymous }, controller.signal);
        } catch (_) {
          if (!controller.signal.aborted)
            setSnackbarValue({ open: true, severity: 'error', msg: t('lockSettings.failed') });
        } finally {
          pending = false;
          if (!controller.signal.aborted) setRefreshing(false);
        }
      }
    };
    document.addEventListener('touchstart', begin, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', reset);
    window.addEventListener(cancelPullRefreshEvent, reset);
    return () => {
      controller.abort();
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener('touchstart', begin);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', reset);
      window.removeEventListener(cancelPullRefreshEvent, reset);
    };
  }, [pathname, threshold, companyID, isAnonymous, setSnackbarValue, t]);
  return <AppRefreshIndicator distance={distance} refreshing={refreshing} threshold={threshold} />;
}
