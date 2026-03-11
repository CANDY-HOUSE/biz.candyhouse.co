import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { Box, FormControl, Select, MenuItem, IconButton, Typography } from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MobileQRCodeDialog from './MobileQRCodeDialog';
import { biz3utils } from '@/utils/biz3utils';
import { useTranslation } from 'react-i18next';

const MobileDeviceShareQRCode = () => {
  const { gMediaType, gManageGroup, gStripe, gManageDevice } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const deviceUUID = searchParams.get('deviceUUID');
  const deviceName = searchParams.get('deviceName');
  const [selectedRole, setSelectedRole] = useState();
  const { t } = useTranslation();
  const [dataURL, setDataURL] = useState('');
  const qrCodeURLs = useRef({});
  const [roleOptions, setRoleOptions] = useState([]);
  const [currentDeviceKey, setCurrentDeviceKey] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const device = gManageDevice.companyDevices.find((it) => it.deviceUUID === deviceUUID);
    if (device) {
      setCurrentDeviceKey(device);
    }
  }, [gManageDevice.companyDevices]);

  useEffect(() => {
    gManageDevice.getCompanyDevices(true);
  }, []);

  useEffect(() => {
    if (!currentDeviceKey) {
      return;
    }
    setSelectedRole(currentDeviceKey.keyLevel);
    const allRoleOptions = [
      { value: 0, label: t('deviceMember.role.owner') },
      { value: 1, label: t('deviceMember.role.manager') },
      { value: 2, label: t('deviceMember.role.guest') },
    ];
    const availableOptions = allRoleOptions.filter((option) => option.value >= currentDeviceKey.keyLevel);
    setRoleOptions(availableOptions);
  }, [currentDeviceKey]);

  const generateQRCode = useCallback(
    async (cb) => {
      let qrCodeURL = '';
      switch (selectedRole) {
        case 0:
        case 1:
          qrCodeURL = biz3utils.generateInviteGuestQRCodeByInfo(currentDeviceKey, { keyLevel: selectedRole });
          break;
        case 2:
          try {
            const guestKeyId = await new Promise((resolve, reject) => {
              gManageGroup.generateGuestQRCode(currentDeviceKey, (res) => {
                if (!res.success) {
                  reject(new Error('Failed to generate guest QR code'));
                  return;
                }
                resolve(res.data);
              });
            });
            qrCodeURL = biz3utils.generateInviteGuestQRCodeByInfo(currentDeviceKey, {
              keyLevel: selectedRole,
              guestKeyId,
            });
          } catch (error) {
            console.error('Error generating guest QR code:', error);
            return;
          }
          break;
        default:
          break;
      }
      cb && cb(qrCodeURL);
    },
    [selectedRole, currentDeviceKey, deviceUUID]
  );

  const writeQrcode = useCallback((qrCodeURL) => {
    biz3utils.writeQrcode(qrCodeURL, (ins) => {
      if (ins) {
        const url = ins.toDataURL(10, 0);
        setDataURL(url);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedRole === null) {
      return;
    }
    const cachedURL = qrCodeURLs.current[selectedRole];
    if (cachedURL) {
      writeQrcode(cachedURL);
      return;
    }
    generateQRCode((qrCodeURL) => {
      if (qrCodeURL) {
        qrCodeURLs.current[selectedRole] = qrCodeURL;
      }
      writeQrcode(qrCodeURL);
    });
  }, [selectedRole, currentDeviceKey, generateQRCode, writeQrcode]);

  const handleRoleChange = useCallback((event) => {
    setSelectedRole(event.target.value);
  }, []);

  return selectedRole === undefined ? (
    <></>
  ) : (
    <Box
      sx={{
        width: '100%',
        bgcolor: 'background.paper',
        position: 'relative',
        height: '100vh',
      }}
    >
      {!gStripe.isFromApp && (
        <Box sx={{ display: 'flex', alignItems: 'center', pt: 1, pl: 2 }}>
          <IconButton onClick={() => navigate(-1)} disableRipple>
            <KeyboardArrowLeftIcon sx={{ ml: -2 }} />
            <Typography variant="h3" sx={{ color: 'title.main' }}>
              {t('pages.login.ReturnToMailInput')}
            </Typography>
          </IconButton>
        </Box>
      )}
      <MobileQRCodeDialog
        open={true}
        qrCodeUrl={dataURL}
        isMobile={gMediaType.isMobile}
        userName={deviceName}
        fullScreen
        title={`${deviceName} ${t('pages.sesameAccessControlDevice.index.AddKeyByScan')}`}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          zIndex: 1500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            p: 2,
          }}
        >
          <FormControl fullWidth>
            <Select variant="standard" value={selectedRole} disableUnderline onChange={handleRoleChange}>
              {roleOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
    </Box>
  );
};

export default MobileDeviceShareQRCode;
