import { Box, IconButton, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UpgradeFirmware from './UpgradeFirmware';
import { useContext, useMemo } from 'react';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';

const UpgradeSSMFirmware = () => {
  const { gStripe, gManageDevice } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ssmUUID = searchParams.get('ssmUUID');
  const hub3UUID = searchParams.get('deviceUUID');

  const device = useMemo(() => {
    const companyDevice = gManageDevice.companyDevices.find((d) => d.deviceUUID === ssmUUID);
    if (companyDevice) return companyDevice;
    const sesameDevices = gManageDevice.deviceStatus?.stateInfo?.sesameDevices ?? [];
    return sesameDevices.find((d) => d.deviceUUID === ssmUUID) || {};
  }, [ssmUUID, gManageDevice.companyDevices, gManageDevice.deviceStatus]);

  return (
    <>
      {!gStripe.isFromApp && (
        <Box sx={{ display: 'flex', alignItems: 'center', pt: 1, pl: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <KeyboardArrowLeftIcon sx={{ ml: -2 }} />
          </IconButton>
          <Typography variant="h3">{t('pages.login.ReturnToMailInput')}</Typography>
        </Box>
      )}
      <Box sx={{ width: '100%', bgcolor: 'background.paper', pl: 0 }}>
        <Box sx={{ bgcolor: 'secondary.light', p: 2 }}>
          <Typography>
            {t('pages.sesameAccessControlDevice.index.UpgradeHint', { hub: 'Hub3', sesame: device?.deviceName })}
          </Typography>
        </Box>
      </Box>
      <UpgradeFirmware device={device} Hub3DeviceUUID={hub3UUID} />
    </>
  );
};

export default UpgradeSSMFirmware;
