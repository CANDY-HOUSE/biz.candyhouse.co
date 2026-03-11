import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export const CfpMsg = ({ msg, onClick }) => {
  return (
    <Box
      sx={{
        width: 'auto',
        margin: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
      }}
    >
      <Typography sx={{ alignSelf: 'flex-start' }}>{msg}</Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={onClick}
        sx={{
          marginTop: '10px',
          width: '64px',
          borderRadius: '6px',
          color: '#28aeb1',
        }}
      >
        確定
      </Button>
    </Box>
  );
};
