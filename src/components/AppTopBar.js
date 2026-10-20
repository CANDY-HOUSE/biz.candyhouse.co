import { useRef, useState } from 'react';
import { Box, ButtonBase, Popover } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BackButton from '@/components/BackButton';
import useAppLayer from '@/hooks/useAppLayer';
import { appRouteInfo, appTopBarHeight } from '@/services/appNavigation';
import { ContactIcon, CubeIcon, ScanIcon } from './appIcons';

const menuColor = 'rgb(68, 68, 68)';
const appEvent = (type, detail) => window.dispatchEvent(new CustomEvent(type, { detail }));

/** Long press, as on the former native toolbar; a move or early release cancels it. */
function useLongPress(action, delay = 500) {
  const timer = useRef(null);
  const start = useRef(null);
  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    onPointerDown: (event) => {
      start.current = { x: event.clientX, y: event.clientY };
      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        action();
      }, delay);
    },
    onPointerMove: (event) => {
      if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (event) => event.preventDefault(),
  };
}

/** App header row: ⊕ menu on tab pages, back on child pages without their own header. */
export default function AppTopBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const anchor = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const route = appRouteInfo(pathname);
  const internalTest = useLongPress(() => appEvent('app-internal-test'));
  useAppLayer(menuOpen, () => setMenuOpen(false));
  if (route.pageHeader) return null;
  const choose = (type, detail) => {
    setMenuOpen(false);
    appEvent(type, detail);
  };
  const items = [
    ['appHome.addNewDevice', CubeIcon, () => choose('app-navigate', '/app/register')],
    ['appHome.scanQrCode', ScanIcon, () => choose('app-scan-qr')],
    ['appHome.addContacts', ContactIcon, () => choose('app-navigate', '/contact-add')],
  ];
  return (
    <Box
      component="header"
      sx={{
        position: route.tab ? 'relative' : 'sticky',
        top: 0,
        zIndex: 1100,
        flexShrink: 0,
        height: appTopBarHeight,
        bgcolor: '#fff',
      }}
    >
      {!route.tab && (
        <BackButton aria-label={t('peripheral.back')} onClick={() => appEvent('app-back')} sx={{ height: '100%' }} />
      )}
      {pathname === '/' && (
        <Box
          {...internalTest}
          sx={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 120, transform: 'translateX(-50%)' }}
        />
      )}
      {route.tab && (
        <ButtonBase
          ref={anchor}
          disableRipple
          aria-label={t('appHome.addNewDevice')}
          onClick={() => setMenuOpen(true)}
          sx={{ position: 'absolute', top: 0, right: 8, width: 48, height: '100%', fontSize: 32, color: '#000' }}
        >
          ⊕
        </ButtonBase>
      )}
      <Popover
        open={menuOpen && route.tab}
        anchorEl={anchor.current}
        onClose={() => setMenuOpen(false)}
        // ⊕ sits 8px from the edge; the default 16px margin would shift the arrow off its center.
        marginThreshold={8}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 0, sx: { bgcolor: 'transparent', overflow: 'visible', width: 180 } } }}
      >
        <Box
          sx={{
            width: 0,
            height: 0,
            ml: 'auto',
            mr: '18px',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: `12px solid ${menuColor}`,
          }}
        />
        <Box sx={{ bgcolor: menuColor, borderRadius: '4px' }}>
          {items.map(([label, Icon, action]) => (
            <ButtonBase
              key={label}
              disableRipple
              onClick={action}
              sx={{
                width: '100%',
                justifyContent: 'flex-start',
                gap: '10px',
                p: '18px 16px 18px 24px',
                color: '#fff',
                fontSize: 15,
                textAlign: 'left',
              }}
            >
              <Icon />
              {t(label)}
            </ButtonBase>
          ))}
        </Box>
      </Popover>
    </Box>
  );
}
