import React, { useMemo } from 'react';
import { Dialog, DialogContent, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const MobileQRCodeDialog = ({
  open,
  onClose,
  userName,
  qrCodeUrl,
  isMobile = false,
  title = '私を連絡先に追加してください',
  subtitle = '',
  fullScreen = false,
}) => {
  const { t } = useTranslation();
  subtitle = subtitle || t('pages.sesameAccessControlDevice.index.AddDeviceKeyByScanHint');

  const QRCodeContent = useMemo(
    () => (
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            mb: 3,
            color: '#333',
          }}
        >
          {userName}
        </Typography>
        <Box
          sx={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            mb: 4,
          }}
        >
          <img
            src={qrCodeUrl}
            alt="QR Code"
            style={{
              /* Face3 的摄像头无法调焦， 小了扫码困难。 */
              width: isMobile ? '320px' : '380px',
              height: isMobile ? '320px' : '380px',
              display: qrCodeUrl ? 'block' : 'none',
            }}
          />
        </Box>

        <Typography
          variant="body1"
          sx={{
            color: '#666',
            mb: 1,
            fontSize: '16px',
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: '#999',
            fontSize: '14px',
          }}
        >
          {subtitle}
        </Typography>
      </DialogContent>
    ),
    [userName, qrCodeUrl, isMobile, title, subtitle]
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          bgcolor: 'background.paper',
          pt: '100px',
        }}
      >
        {QRCodeContent}
      </Box>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={false}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          margin: isMobile ? 0 : '32px',
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
        },
      }}
    >
      {QRCodeContent}
    </Dialog>
  );
};

export default MobileQRCodeDialog;
