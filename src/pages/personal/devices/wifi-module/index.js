import React, { useContext, useMemo } from 'react';
import { Box, IconButton, Typography, Grid2, List, ListItem } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import DeviceUserList from '@/components/DeviceUserList';
import { useTranslation } from 'react-i18next';
import MobileBindDevice from '@/components/MobileBindDevice';
import MobileWifiModule from '@/components/MobileWifiModule';
import MobileHub3RemoteList from '@/components/MobileHub3RemoteList';
import MobileBatteryChart from '@/components/MobileBatteryChart';

const WifiModuleIndex = () => {
  const navigate = useNavigate();
  const { gMediaType, gManageDevice } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const did = searchParams.get('deviceUUID') || '';
  const deviceName = searchParams.get('deviceName') || '';

  const currentDevice = useMemo(() => {
    return gManageDevice.companyDevices.find((item) => item.deviceUUID === did) || {};
  }, [gManageDevice.filteredSsmDevices, did]);

  return (
    <Box sx={{ bgcolor: '#FBFBFB', overscrollBehavior: 'none', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: gMediaType.isMobile ? 0 : 4, pt: 2 }}>
        <IconButton onClick={() => navigate(-1)} disableRipple>
          <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
          <Typography variant="h3" sx={{ color: 'black' }}>
            {deviceName}
          </Typography>
        </IconButton>
      </Box>
      <Grid2
        container
        spacing={2}
        sx={{
          py: 2,
          px: gMediaType.isMobile ? 0 : 4,
          '& > *': {
            '& > .MuiBox-root, & > .MuiCard-root': {
              backgroundColor: 'white',
              height: '100%',
              overflow: 'auto',
            },
            '& .MuiTypography-h4': {
              p: 1,
              fontWeight: 'bold',
              pb: 0,
            },
          },
        }}
      >
        {gMediaType.isMobile ? (
          <Grid2 size={12}>
            <MobileWifiModule />
          </Grid2>
        ) : (
          <>
            <Grid2 size={4} sx={{ height: '560px' }}>
              <Box>
                <Typography variant="h4">{t('deviceMember.user')}</Typography>
                <DeviceUserList deviceUUID={did} defaultManageMode />
              </Box>
            </Grid2>
            <Grid2 size={4} sx={{ height: '560px' }}>
              <Box>
                <Typography variant="h4">{t('pages.sesameAccessControlDevice.index.connectedIRDevices')}</Typography>
                <List>
                  <Box sx={{ bgcolor: 'secondary.main', pl: 2, py: 0.5 }}>
                    <Typography color="info.light" sx={{ lineHeight: '30px' }}>
                      {t('pages.sesameAccessControlDevice.index.BindDeviceToHub3Hint', { deviceName: 'Hub3' })}
                    </Typography>
                  </Box>
                  <ListItem sx={{ py: 0 }}>
                    <MobileBindDevice device={currentDevice} />
                  </ListItem>
                  <Box sx={{ bgcolor: 'secondary.main', pl: 2, py: 0.5 }}>
                    <Typography color="info.light" sx={{ lineHeight: '30px' }}>
                      {t('pages.sesameAccessControlDevice.index.BindIRToHub3Hint')}
                    </Typography>
                  </Box>
                  <ListItem sx={{ py: 0 }}>
                    <MobileHub3RemoteList deviceUUID={did} />
                  </ListItem>
                </List>
              </Box>
            </Grid2>
            <Grid2 size={4} sx={{ height: '560px' }}>
              <Box>
                <MobileWifiModule />
              </Box>
            </Grid2>
            <Grid2 size={12}>
              <Box>
                <Typography variant="h4">{t('pages.sesameAccessControlDevice.index.Battery')}</Typography>
                <MobileBatteryChart deviceUUID={did} />
              </Box>
            </Grid2>
          </>
        )}
      </Grid2>
    </Box>
  );
};

export default WifiModuleIndex;
