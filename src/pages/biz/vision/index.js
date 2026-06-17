import React from 'react';
import { Box, Typography } from '@mui/material';
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';

export default function Vision() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minHeight: '60vh',
      }}
    >
      <Box sx={{ color: 'title.other', display: 'flex' }}>
        <VisionIcon width={96} height={96} />
      </Box>
      <Typography sx={{ fontSize: '13px', color: 'title.other' }}>coming soon</Typography>
    </Box>
  );
}
