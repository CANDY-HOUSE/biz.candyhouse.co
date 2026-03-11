import React, { useEffect, useState, useContext } from 'react';
import { Snackbar } from '@mui/material';
import { GlobalStateContext } from '@context/GlobalContextProvider';

const GSnackbar = ({ value }) => {
  const [data, setData] = useState(value);
  const { gMediaType, gStripe } = useContext(GlobalStateContext);
  const isMobile = gMediaType.isMobile;
  const isFromApp = gStripe.isFromApp;

  useEffect(() => {
    setData(value);
  }, [value]);

  const closeSnackbar = () => {
    setData((prevState) => ({
      ...prevState,
      open: false,
    }));
  };

  // 根据设备类型决定样式
  const isFullWidth = isMobile || isFromApp;

  return (
    <Snackbar
      style={
        isFullWidth
          ? {
              position: 'fixed',
              left: '0',
              right: '0',
              width: '100vw',
              maxWidth: '100vw',
              margin: 0,
              padding: '0 2.5vw',
              boxSizing: 'border-box',
              zIndex: 9999,
            }
          : {
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
            }
      }
      container={document.body}
      disablePortal={false}
      sx={{
        whiteSpace: 'pre-line',
        wordBreak: 'break-word',
        ...(isFullWidth && {
          '& .MuiSnackbarContent-root': {
            width: '100%',
            maxWidth: '100%',
            margin: '0',
            borderRadius: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.80)',
            color: '#000000',
          },
          '& .MuiSnackbarContent-message': {
            color: '#000000',
          },
        }),
        ...(!isFullWidth && {
          '& .MuiSnackbarContent-root': {
            borderRadius: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.80)',
            color: '#000000',
          },
          '& .MuiSnackbarContent-message': {
            color: '#000000',
          },
        }),
      }}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={data.open}
      autoHideDuration={1500}
      onClose={closeSnackbar}
      message={data.msg || '未知信息'}
      onClick={() => closeSnackbar()}
    />
  );
};

export default GSnackbar;
