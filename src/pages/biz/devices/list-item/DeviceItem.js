import React, { useContext, useEffect, useMemo } from 'react';
import { Box, Grid2, IconButton, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DeviceHistory from '@/components/DeviceHistory';
import DeviceUserList from '@/components/DeviceUserList';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import MobileBatteryChart from '@/components/MobileBatteryChart';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import DeviceSetting from '@/components/DeviceSetting';
import { MoreHoriz } from '@mui/icons-material';
import { useNavigateUtils } from '@/hooks/useNavigateUtils';

const DeviceItem = () => {
  const { gMediaType, gManageDevice } = useContext(GlobalStateContext);
  const { navigateToDeviceSetting } = useNavigateUtils();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const did = searchParams.get('deviceUUID') || '';
  const deviceName = searchParams.get('deviceName') || '';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const device = useMemo(() => {
    return gManageDevice.companyDevices.find((item) => item.deviceUUID === did) || {};
  }, [gManageDevice.companyDevices, did]);

  return (
    <Box sx={{ bgcolor: '#FBFBFB', overscrollBehavior: 'none' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: gMediaType.isMobile ? 0 : 4,
          pt: 2,
        }}
      >
        <IconButton onClick={() => navigate(-1)} disableRipple>
          <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
          <Typography variant="h3" sx={{ color: 'black' }}>
            {deviceName}
          </Typography>
        </IconButton>
        {gMediaType.isMobile ? (
          <IconButton onClick={() => navigateToDeviceSetting(device)} disableRipple>
            <MoreHoriz sx={{ color: 'black' }} />
          </IconButton>
        ) : null}
      </Box>
      <Grid2
        container
        spacing={3}
        sx={{
          py: 2,
          px: gMediaType.isMobile ? 0 : 4,
          '& > *': {
            '& > .MuiBox-root': {
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
            <DeviceHistory />
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
                <Typography variant="h4">{t('pages.sesameAccessControlDevice.index.history', '履歴')}</Typography>
                <DeviceHistory deviceUUID={did} showToolBar />
              </Box>
            </Grid2>
            <Grid2 size={4} sx={{ height: '560px' }}>
              <DeviceSetting showBack={false} />
            </Grid2>
            <Grid2 size={12} sx={{ height: '560px' }}>
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

export default DeviceItem;
