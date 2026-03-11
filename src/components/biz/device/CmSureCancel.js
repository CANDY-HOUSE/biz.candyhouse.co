import React from 'react';
import { IconButton, Button, Box, Typography } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

const CmSureCancel = ({ title, message, cancelClick, sureClick }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        margin: '10px 20px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          marginBottom: '20px',
          alignItems: 'center',
        }}
      >
        <IconButton sx={{ color: '#000', paddingLeft: '0px' }}>
          <WarningIcon sx={{ fontSize: '30px' }} />
        </IconButton>
        <Typography
          sx={{
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: '22px',
            fontWeight: 'bold',
          }}
        >
          {title}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: "'Noto Sans JP', sans-serif",
          fontSize: '16px',
          marginBottom: '20px',
        }}
      >
        {message}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mt: '10px',
        }}
      >
        <Button
          variant="outlined"
          onClick={cancelClick}
          sx={{
            fontFamily: "'Noto Sans JP', sans-serif",
            border: '1px solid #28aeb1',
            color: '#28aeb1',
            marginRight: '10px',
            '&:hover': {
              color: '#28aeb1',
              border: '1px solid #28aeb1',
              opacity: '0.8',
            },
          }}
        >
          キャンセル
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={sureClick}
          sx={{
            fontFamily: "'Noto Sans JP', sans-serif",
            backgroundColor: '#28aeb1',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#28aeb1',
              opacity: '0.8',
            },
          }}
          disableElevation
        >
          このまま削除を実行
        </Button>
      </Box>
    </Box>
  );
};

export default CmSureCancel;
