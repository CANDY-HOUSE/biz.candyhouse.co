import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CircularProgress, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { appTabPaths } from '@/services/appNavigation';

export default function AppPullRefresh() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const hubPage = ['/biz/wifi-module', '/biz/wifi-module/index'].includes(pathname);
    if (!hubPage && (pathname === '/' || !appTabPaths.includes(pathname))) return;
    let start = null;
    let pull = 0;
    const reset = () => {
      start = null;
      pull = 0;
      setDistance(0);
    };
    const begin = (event) => {
      reset();
      if (
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
      if (!start || event.touches.length !== 1) return;
      const dy = event.touches[0].clientY - start.y;
      const dx = Math.abs(event.touches[0].clientX - start.x);
      if (dy < 0 || dx > Math.max(12, dy)) {
        reset();
        return;
      }
      pull = Math.min(dy, 100);
      if (pull > 12) {
        if (event.cancelable) event.preventDefault();
        setDistance(pull);
      }
    };
    const end = () => {
      const refresh = pull >= 70;
      reset();
      if (refresh) {
        setRefreshing(true);
        window.location.reload();
      }
    };
    document.addEventListener('touchstart', begin, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', reset);
    return () => {
      document.removeEventListener('touchstart', begin);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', reset);
    };
  }, [pathname]);
  if (!distance && !refreshing) return null;
  return (
    <Paper
      sx={{
        position: 'fixed',
        top: 8,
        left: 'calc(50% - 20px)',
        zIndex: 1400,
        p: 1,
        borderRadius: '50%',
        pointerEvents: 'none',
      }}
    >
      <CircularProgress
        size={24}
        aria-label={t('appHome.refreshing')}
        variant={refreshing ? 'indeterminate' : 'determinate'}
        value={Math.min((distance / 70) * 100, 100)}
      />
    </Paper>
  );
}
