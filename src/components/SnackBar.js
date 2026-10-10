import React, { useEffect, useState } from 'react';
import { Portal, Snackbar } from '@mui/material';

const GSnackbar = ({ value }) => {
  const [data, setData] = useState(value);

  useEffect(() => {
    setData(value);
  }, [value]);

  const closeSnackbar = () => {
    setData((prevState) => ({
      ...prevState,
      open: false,
    }));
  };

  return (
    <Portal>
      <Snackbar
        sx={{
          bottom: { xs: 'calc(72px + env(safe-area-inset-bottom))', sm: 'calc(72px + env(safe-area-inset-bottom))' },
          left: { xs: '50%', sm: '50%' },
          right: 'auto',
          transform: 'translateX(-50%)',
          width: 'max-content',
          maxWidth: '90vw',
          zIndex: 9999,
          whiteSpace: 'pre-line',
          wordBreak: 'break-word',
          '& .MuiSnackbarContent-root': {
            minWidth: 0,
            maxWidth: '100%',
            flexGrow: 0,
            borderRadius: '20px',
            bgcolor: 'rgba(50, 50, 50, 0.9)',
            color: '#fff',
            px: 2,
            py: 0.5,
          },
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={data.open}
        autoHideDuration={1500}
        onClose={closeSnackbar}
        message={data.msg || '未知信息'}
        onClick={() => closeSnackbar()}
      />
    </Portal>
  );
};

export default GSnackbar;
