import { isValidElement, useContext } from 'react';
import { Box, Typography } from '@mui/material';
import BackButton from '@/components/BackButton';
import { GlobalStateContext } from '@context/GlobalContextProvider';

// For an element title such as EditableText: the theme h3 in px (EditableText scales em again) and a fixed
// weight (bolder resolves against the parent and turns 900 inside the input).
export const pageHeaderTitleStyle = {
  fontSize: '18px',
  fontWeight: 700,
  lineHeight: '1.3',
  color: 'black',
  width: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const titleNode = (title) =>
  isValidElement(title) ? (
    title
  ) : (
    <Typography variant="h3" noWrap sx={{ color: 'black' }}>
      {title}
    </Typography>
  );

/**
 * Page title row: back arrow, title right after it, actions on the right. Sticks to the top of its scroll area.
 * @param {function} [onBack] shows the back arrow; a text title also goes back
 * @param {React.ReactNode} [title] next to the back arrow; a string renders as h3, an element (e.g. EditableText
 *   with pageHeaderTitleStyle) as is
 * @param {React.ReactNode} [centerTitle] centered between the back arrow and the actions
 * @param {React.ReactNode} [action] right side buttons
 */
export default function PageHeader({ onBack, title, centerTitle, action, sx, ...props }) {
  const { gMediaType } = useContext(GlobalStateContext);
  const backOnTitle = onBack && !isValidElement(title) ? onBack : undefined;
  return (
    <Box
      component="header"
      {...props}
      sx={[
        {
          display: 'flex',
          alignItems: 'center',
          minHeight: 48,
          flexShrink: 0,
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          px: gMediaType.isMobile ? 0 : 4,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {onBack && <BackButton onClick={onBack} sx={{ flexShrink: 0, justifyContent: 'flex-start' }} />}
      {title != null && (
        // The arrow sits at the left of its 48px button; pull the title back so it starts right after the arrow.
        <Box
          onClick={backOnTitle}
          sx={{
            flex: '0 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            ml: onBack ? '-16px' : 2,
            mr: 1,
            cursor: backOnTitle && 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {titleNode(title)}
        </Box>
      )}
      {centerTitle != null && (
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>{titleNode(centerTitle)}</Box>
      )}
      {action && <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, ml: 'auto' }}>{action}</Box>}
    </Box>
  );
}
