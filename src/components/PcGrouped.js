import { Box, Typography } from '@mui/material';
import BackButton from '@/components/BackButton';
import { ios, hoverSx, hairline } from '@/theme/appHomeStyle';

// Browser pages on the grouped background: a large title, then labelled white cards of rows.
export function PcPage({ title, onBack, action, children, sx }) {
  return (
    <Box sx={{ px: '16px', pt: '8px', pb: '32px', ...sx }}>
      {(title || onBack) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', px: '4px', mb: '20px', minHeight: 40 }}>
          {onBack && <BackButton onClick={onBack} sx={{ ml: '-8px' }} />}
          <Typography
            sx={{ minWidth: 0, mr: '12px', fontSize: 28, fontWeight: 700, lineHeight: '36px', color: ios.label }}
          >
            {title}
          </Typography>
          {action}
        </Box>
      )}
      {children}
    </Box>
  );
}

export function PcSection({ title, action, footer, children, sx, cardSx }) {
  return (
    <Box sx={{ mb: '28px', ...sx }}>
      {(title || action) && (
        <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 28, px: '20px', pb: '6px' }}>
          <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 500, color: ios.secondaryLabel }}>{title}</Typography>
          {action}
        </Box>
      )}
      <Box sx={{ bgcolor: ios.card, borderRadius: ios.cardRadius, overflow: 'hidden', ...cardSx }}>{children}</Box>
      {footer && (
        <Typography sx={{ px: '20px', pt: '8px', fontSize: 13, color: ios.secondaryLabel }}>{footer}</Typography>
      )}
    </Box>
  );
}

const separatorSx = {
  '&:not(:last-child)::after': {
    content: '""',
    position: 'absolute',
    left: 20,
    right: 0,
    bottom: 0,
    height: 0,
    borderBottom: hairline,
  },
};

export const pcFieldSx = {
  '& .MuiFilledInput-root': {
    borderRadius: '10px',
    bgcolor: ios.fill,
    '&:hover, &.Mui-focused': { bgcolor: ios.fill },
    '&::before, &::after': { display: 'none' },
  },
};

// One row of a card: label on the left, value or controls on the right.
export function PcRow({ label, value, children, onClick, sx }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minHeight: 52,
        px: '20px',
        py: '8px',
        ...separatorSx,
        ...(onClick && {
          cursor: 'pointer',
          '&:active': { bgcolor: ios.pressed },
          ...hoverSx({ bgcolor: ios.pressed }),
        }),
        ...sx,
      }}
    >
      {label !== undefined && (
        <Typography
          component="div"
          sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', fontSize: 16, color: ios.label }}
        >
          {label}
        </Typography>
      )}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: label !== undefined ? 'flex-end' : 'flex-start',
          gap: '8px',
          fontSize: 16,
          color: ios.secondaryLabel,
          textAlign: label !== undefined ? 'right' : 'left',
          wordBreak: 'break-all',
        }}
      >
        {value}
        {children}
      </Box>
    </Box>
  );
}
