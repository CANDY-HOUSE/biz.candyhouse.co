import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

// In-flow space moves the page content without changing sortable transforms.
export default function AppRefreshIndicator({ distance = 0, refreshing = false, threshold = 70 }) {
  const { t } = useTranslation();
  const height = refreshing ? Math.max(distance, 56) : distance;
  const progress = Math.max(0, Math.min(distance / threshold, 1));
  return (
    <Box
      style={{ height, transition: distance > 0 ? 'none' : undefined }}
      sx={{
        flexShrink: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        transition: 'height 220ms ease-out',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {height > 0 && (
        <Box
          role="progressbar"
          aria-label={t('appHome.refreshing')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={refreshing ? undefined : progress * 100}
          style={{ animation: refreshing ? 'app-refresh-spin 800ms steps(12) infinite' : 'none' }}
          sx={{
            position: 'relative',
            width: 30,
            height: 30,
            flexShrink: 0,
            '@keyframes app-refresh-spin': { to: { transform: 'rotate(360deg)' } },
          }}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <Box
              key={index}
              style={{
                opacity:
                  ((index + 1) / 12) *
                  (refreshing ? 1 : (0.35 + progress * 0.65) * Math.max(0, Math.min(progress * 12 - index, 1))),
              }}
              sx={{
                position: 'absolute',
                left: 13.25,
                top: 0,
                width: 3.5,
                height: 8,
                borderRadius: 2,
                bgcolor: '#28aeb1',
                transformOrigin: '1.75px 15px',
                transform: `rotate(${index * 30}deg)`,
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
