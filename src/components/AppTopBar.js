import { useRef, useState } from 'react';
import { Box, ButtonBase, Popover } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BackButton from '@/components/BackButton';
import useAppLayer from '@/hooks/useAppLayer';
import { ios } from '@/theme/appHomeStyle';
import { appRouteInfo, appTabHeaderSx, appTabTopBarHeight, appTopBarHeight } from '@/services/appNavigation';
import { ContactIcon, CubeIcon, ScanIcon } from './appIcons';
import { PATHS } from '@/routes/manifest';

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

/** App header row: + menu on tab pages, back on child pages without their own header. */
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
    ['appHome.addNewDevice', CubeIcon, () => choose('app-navigate', PATHS.appRegister)],
    ['appHome.scanQrCode', ScanIcon, () => choose('app-scan-qr')],
    ['appHome.addContacts', ContactIcon, () => choose('app-navigate', PATHS.contactAdd)],
  ];
  return (
    <Box
      component="header"
      sx={
        route.tab
          ? {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1100,
              height: appTabTopBarHeight,
              ...appTabHeaderSx,
            }
          : {
              position: 'sticky',
              top: 0,
              zIndex: 1100,
              flexShrink: 0,
              height: appTopBarHeight,
              bgcolor: '#fff',
            }
      }
    >
      {!route.tab && (
        <BackButton
          aria-label={t('peripheral.back')}
          onClick={() => appEvent('app-back')}
          sx={{ height: '100%', justifyContent: 'flex-start' }}
        />
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
          sx={{
            position: 'absolute',
            right: 16,
            top: 8,
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: '#fff',
            color: ios.label,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            transition: `transform 0.2s ${ios.spring}`,
            '&:active': { transform: 'scale(0.9)' },
          }}
        >
          <AddIcon sx={{ fontSize: 24 }} />
        </ButtonBase>
      )}
      <Popover
        open={menuOpen && route.tab}
        anchorEl={anchor.current}
        onClose={() => setMenuOpen(false)}
        marginThreshold={16}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          // Like an iOS context menu, any touch outside dismisses it; a drag never makes the click MUI waits for.
          root: { slotProps: { backdrop: { invisible: true, onPointerDown: () => setMenuOpen(false) } } },
          paper: {
            elevation: 0,
            sx: {
              mt: '8px',
              width: 250,
              borderRadius: '14px',
              bgcolor: 'rgba(250,250,250,0.86)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            },
          },
        }}
      >
        {items.map(([label, Icon, action], index) => (
          <ButtonBase
            key={label}
            disableRipple
            onClick={action}
            sx={{
              width: '100%',
              minHeight: 48,
              justifyContent: 'space-between',
              gap: '12px',
              px: '16px',
              color: ios.label,
              fontSize: 17,
              textAlign: 'left',
              boxShadow: index < items.length - 1 ? `inset 0 -0.5px 0 ${ios.separator}` : 'none',
              '&:active': { bgcolor: ios.pressed },
            }}
          >
            {t(label)}
            <Icon size={20} color={ios.label} />
          </ButtonBase>
        ))}
      </Popover>
    </Box>
  );
}
