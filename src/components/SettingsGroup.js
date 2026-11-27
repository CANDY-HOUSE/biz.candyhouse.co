import { Box, Typography } from '@mui/material';
import { ios, hairline } from '@/theme/appHomeStyle';

// iOS-style switch: wide rounded track, white thumb, tint when on.
export const iosSwitchSx = {
  '& .MuiSwitch-root': { width: 51, height: 31, p: 0, mx: '4px', overflow: 'visible', flexShrink: 0 },
  '& .MuiSwitch-switchBase': {
    p: '2px',
    color: '#fff',
    '&.Mui-checked': { transform: 'translateX(20px)', color: '#fff' },
    '&.Mui-checked + .MuiSwitch-track': { bgcolor: ios.tint, opacity: 1 },
    '&.Mui-disabled': { color: '#fff' },
    '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.5 },
  },
  '& .MuiSwitch-thumb': { width: 27, height: 27, boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16)' },
  '& .MuiSwitch-track': { borderRadius: '16px', bgcolor: '#E9E9EA', opacity: 1, transition: 'background-color 0.2s' },
};

// The existing ListItem / Divider rows drawn as iOS grouped rows inside a card.
export const groupedRowsSx = {
  ...iosSwitchSx,
  '& .MuiListItem-root, & .MuiListItemButton-root': { minHeight: 52 },
  '& .MuiListItemText-root': { my: '6px' },
  // A whole-pixel line height keeps rows (and the separators between them) on whole pixels.
  '& .MuiListItemText-primary': { fontSize: { xs: 17, md: 16 }, lineHeight: { xs: '26px', md: 1.5 }, color: ios.label },
  '& .MuiDivider-root': { m: 0, mt: '-1px', ml: '16px', height: '1px', borderBottom: hairline, opacity: 1 },
  // Rows end with their own divider; the card edge replaces the last one.
  '& > .MuiDivider-root:last-child, & > :last-child > .MuiDivider-root:last-child, & > :last-child > :last-child > .MuiDivider-root:last-child':
    { display: 'none' },
};

// Separators for cards whose rows carry no Divider of their own.
export const rowSeparatorSx = {
  '& > .MuiListItem-root': { position: 'relative' },
  '& > .MuiListItem-root:not(:last-child)::after': {
    content: '""',
    position: 'absolute',
    left: 16,
    right: 0,
    bottom: 0,
    height: '1px',
    borderBottom: hairline,
  },
};

// Bound-device and remote lists pad their rows themselves; in a card they span it with inset separators.
export const nestedListSx = {
  '& > .MuiBox-root > .MuiTypography-root': { px: '16px' },
  '& .MuiList-root > .MuiListItem-root': { px: '16px', minHeight: 52, position: 'relative' },
  '& .MuiList-root > .MuiListItem-root:not(:last-child)::after':
    rowSeparatorSx['& > .MuiListItem-root:not(:last-child)::after'],
  '& .MuiList-root > .MuiDivider-root': { display: 'none' },
};

export const settingsPageSx = { bgcolor: ios.background, pt: '16px', pb: '32px' };

// Header bar on the grouped background, so the page reads as one surface.
export const settingsHeaderSx = { bgcolor: ios.background };

export const groupLabelSx = { px: '16px', fontSize: 13, color: ios.secondaryLabel, whiteSpace: 'pre-line' };

export const groupCardSx = { bgcolor: ios.card, borderRadius: ios.cardRadius, overflow: 'hidden' };

// One card of rows with an optional caption above and note below.
export default function SettingsGroup({ header, footer, children, sx, cardSx }) {
  return (
    <Box sx={{ mx: '16px', mb: '24px', ...sx }}>
      {header && (
        <Typography component="div" sx={{ ...groupLabelSx, pb: '6px' }}>
          {header}
        </Typography>
      )}
      <Box sx={{ ...groupCardSx, ...groupedRowsSx, ...cardSx }}>{children}</Box>
      {footer && (
        <Typography component="div" sx={{ ...groupLabelSx, pt: '8px' }}>
          {footer}
        </Typography>
      )}
    </Box>
  );
}
