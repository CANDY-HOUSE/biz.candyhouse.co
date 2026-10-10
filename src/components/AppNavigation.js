import { useSyncExternalStore } from 'react';
import { appPromotion } from '@/services/appPromotion';
import { Badge, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { appTabPaths } from '@/services/appNavigation';
import { navIconMap } from './biz/layout/navIcons';

const tabs = [
  ['/', 'sesame', 'appHome.sesame'],
  ['/vision', 'vision', 'appHome.vision'],
  ['/contacts', 'contacts', 'appHome.contacts'],
  ['/me/homepage', 'me', 'appHome.me'],
];
export default function AppNavigation() {
  const promotion = useSyncExternalStore(appPromotion.subscribe, appPromotion.getSnapshot);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const selected = location.pathname.startsWith('/me') ? '/me/homepage' : location.pathname;
  if (!appTabPaths.includes(location.pathname)) return null;
  return (
    <Paper elevation={0} sx={{ position: 'relative', flexShrink: 0, zIndex: 1200, pb: 'env(safe-area-inset-bottom)' }}>
      <BottomNavigation
        showLabels
        value={selected}
        onChange={(_, path) => navigate({ pathname: path, search: location.search }, { replace: true })}
      >
        {tabs.map(([path, icon, label]) => {
          const Icon = navIconMap[icon];
          return (
            <BottomNavigationAction
              key={path}
              value={path}
              label={t(label)}
              icon={
                <Badge
                  color="error"
                  variant="dot"
                  invisible={icon !== 'me' || !promotion?.visible}
                  sx={{
                    '& .MuiBadge-dot': {
                      width: 16,
                      height: 16,
                      minWidth: 16,
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
    </Paper>
  );
}
