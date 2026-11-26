import { useSyncExternalStore } from 'react';
import { appPromotion } from '@/services/appPromotion';
import { appUpdate } from '@/services/appUpdate';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { Badge, BottomNavigation, BottomNavigationAction, Box, Paper } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { appTabBarHeight, appTabPaths } from '@/services/appNavigation';
import { navIconMap } from './biz/layout/navIcons';
import { PATHS } from '@/routes/manifest';

const tabInset = 5;
const tabs = [
  ['/', 'sesame', 'appHome.sesame'],
  [PATHS.vision, 'vision', 'appHome.vision'],
  [PATHS.contacts, 'contacts', 'appHome.contacts'],
  [PATHS.meHomepage, 'me', 'appHome.me'],
];
export default function AppNavigation() {
  const promotion = useSyncExternalStore(appPromotion.subscribe, appPromotion.getSnapshot);
  const updateVersion = useSyncExternalStore(appUpdate.subscribe, appUpdate.getSnapshot);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const selected = location.pathname.startsWith(PATHS.me) ? PATHS.meHomepage : location.pathname;
  if (!appTabPaths.includes(location.pathname)) return null;
  const selectedIndex = tabs.findIndex(([path]) => path === selected);
  return (
    <Paper
      elevation={0}
      square
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1200,
        bgcolor: 'transparent',
        px: '12px',
        pb: 'calc(8px + env(safe-area-inset-bottom))',
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          maxWidth: 480,
          mx: 'auto',
          height: appTabBarHeight - 16,
          p: `${tabInset}px`,
          borderRadius: '32px',
          bgcolor: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.8)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
          pointerEvents: 'auto',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: tabInset,
            bottom: tabInset,
            left: tabInset,
            width: `calc((100% - ${tabInset * 2}px) / ${tabs.length})`,
            borderRadius: '27px',
            bgcolor: 'rgba(0,0,0,0.05)',
            transform: `translateX(${selectedIndex * 100}%)`,
            transition: 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        />
        <BottomNavigation
          showLabels
          value={selected}
          onChange={(_, path) => navigate({ pathname: path, search: location.search }, { replace: true })}
          sx={{
            position: 'relative',
            height: '100%',
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              px: 0,
              color: '#777',
              transition: 'color 0.3s ease, transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
              '&:active': { transform: 'scale(0.92)' },
            },
            '& .MuiBottomNavigationAction-root.Mui-selected': {
              color: 'primary.main',
            },
            '& .MuiBottomNavigationAction-label, & .MuiBottomNavigationAction-label.Mui-selected': {
              mt: '2px',
              fontSize: 11,
              fontWeight: 500,
            },
          }}
        >
          {tabs.map(([path, icon, label]) => {
            const Icon = navIconMap[icon];
            const hasUpdate = icon === 'me' && Boolean(updateVersion);
            return (
              <BottomNavigationAction
                key={path}
                value={path}
                label={t(label)}
                aria-label={t(label)}
                icon={
                  <Badge
                    color="error"
                    variant={hasUpdate ? 'standard' : 'dot'}
                    badgeContent={hasUpdate ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : null}
                    invisible={icon !== 'me' || (!hasUpdate && !promotion?.visible)}
                    sx={{
                      '& .MuiBadge-badge': {
                        width: hasUpdate ? 18 : 16,
                        height: hasUpdate ? 18 : 16,
                        minWidth: hasUpdate ? 18 : 16,
                        padding: 0,
                        borderRadius: '50%',
                        bgcolor: '#f44336',
                        top: -4,
                        right: -4,
                      },
                    }}
                  >
                    <Icon selected={selected === path} />
                  </Badge>
                }
              />
            );
          })}
        </BottomNavigation>
      </Box>
    </Paper>
  );
}
