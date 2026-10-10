import { Box } from '@mui/material';

/** White, compact page title row shared by the Web App and desktop detail pages. */
export default function PageHeader({ sx, ...props }) {
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
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
