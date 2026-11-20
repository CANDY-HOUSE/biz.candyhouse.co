import { Box, useMediaQuery } from '@mui/material';
import { isAppHome } from '@/services/deviceService';
import { homeCards, ios } from '@/theme/appHomeStyle';

// Wide browsers show the selected item's page beside the list instead of leaving it.
export const useMasterDetail = () => {
  const wide = useMediaQuery('(min-width:1100px)');
  return wide && homeCards && !isAppHome;
};

// Keeps the add button at the foot of the list column, clear of the panel.
export const fabInListSx = { position: 'sticky', bottom: 16, display: 'flex', ml: 'auto', mr: '16px' };

// The panel stays under the top bar while the list scrolls; without a selection it shows the placeholder.
export default function MasterDetail({ listWidth = 440, list, panel, placeholder }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', pr: '16px' }}>
      <Box sx={{ width: listWidth, flexShrink: 0 }}>{list}</Box>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          position: 'sticky',
          top: 'calc(var(--page-header-offset, 0px) + 4px)',
          height: 'calc(100dvh - var(--page-header-offset, 0px) - 20px)',
          mb: '16px',
        }}
      >
        {panel || (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: ios.cardRadius,
              border: `1px dashed ${ios.separator}`,
              color: ios.tertiaryLabel,
            }}
          >
            {placeholder}
          </Box>
        )}
      </Box>
    </Box>
  );
}
