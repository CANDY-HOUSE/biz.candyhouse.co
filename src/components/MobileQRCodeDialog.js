import React, { useCallback, useMemo, useState } from 'react';
import { Dialog, DialogContent, Typography, Box, Switch } from '@mui/material';
import { useTranslation } from 'react-i18next';
import siteIcon from '@assets/site-icon.png';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const MobileQRCodeDialog = ({
  open,
  onClose,
  userName,
  qrCodeUrl,
  isMobile = false,
  title = '私を連絡先に追加してください',
  subtitle = '',
  fullScreen = false,
  onEncryptChange,
}) => {
  const { t } = useTranslation();
  const [isEncryptEnabled, setIsEncryptEnabled] = useState(true);
  subtitle = subtitle || t('pages.sesameAccessControlDevice.index.AddDeviceKeyByScanHint');

  const handleEncryptChange = useCallback(
    (event) => {
      setIsEncryptEnabled(event.target.checked);
      onEncryptChange?.(event);
    },
    [onEncryptChange]
  );

  const EncryptSwitch = useMemo(
    () =>
      onEncryptChange ? (
        <Box
          sx={{
            width: '100%',
            minHeight: 56,
            mt: 2,
            p: 0,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 1,
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            sx={{
              flex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'clip',
              textAlign: 'left',
              fontSize: 'clamp(0.75rem, 2.6vw, 1rem)',
              lineHeight: 1.2,
              minWidth: 0,
            }}
          >
            {t('deviceMember.qrEncrypted')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <VerifiedUserIcon
              fontSize="small"
              sx={{
                color: isEncryptEnabled ? '#4FC372' : 'grey.400',
                transition: 'color 0.2s ease',
              }}
            />
            <Switch
              size="small"
              checked={isEncryptEnabled}
              onChange={handleEncryptChange}
              inputProps={{ 'aria-label': t('deviceMember.qrEncrypted') }}
            />
          </Box>
        </Box>
      ) : null,
    [handleEncryptChange, isEncryptEnabled, onEncryptChange, t]
  );

  const QRCodeContent = useMemo(
    () => (
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: fullScreen ? 'center' : 'flex-start',
          overflowY: 'auto',
          p: 2,
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
            position: 'relative',
          }}
        >
          <img
            src={qrCodeUrl || undefined}
            alt="QR Code"
            style={{
              /* Face3 的摄像头无法调焦， 小了扫码困难。 */
              width: isMobile ? '320px' : '380px',
              height: isMobile ? '320px' : '380px',
              display: 'block',
              visibility: qrCodeUrl ? 'visible' : 'hidden',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? 56 : 64,
              height: isMobile ? 56 : 64,
              borderRadius: '50%',
              bgcolor: '#fff',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
              display: qrCodeUrl ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1,
            }}
          >
            <img
              src={siteIcon}
              alt="Site Icon"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </Box>
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
        {EncryptSwitch}
      </DialogContent>
    ),
    [userName, qrCodeUrl, isMobile, title, subtitle, fullScreen, EncryptSwitch]
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
