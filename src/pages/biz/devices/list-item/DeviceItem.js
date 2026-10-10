import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import React, { useContext, useEffect, useMemo } from 'react';
import { Box, Grid2, IconButton, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DeviceHistory from '@/components/DeviceHistory';
import DeviceUserList from '@/components/DeviceUserList';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import MobileBatteryChart from '@/components/MobileBatteryChart';
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
    <Box
      sx={{
        bgcolor: 'background.paper',
        overscrollBehavior: 'none',
        ...(gMediaType.isMobile && {
          height: 'var(--page-viewport-height, 100dvh)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }),
      }}
    >
      <PageHeader
        sx={{
          position: gMediaType.isMobile ? 'sticky' : 'static',
          zIndex: gMediaType.isMobile ? 1100 : 'auto',
          top: 'var(--page-header-offset, 0px)',
          justifyContent: 'space-between',
          px: gMediaType.isMobile ? 0 : 4,
        }}
      >
        <BackButton onClick={() => navigate(-1)} disableRipple>
          <Typography variant="h3" sx={{ color: 'black' }}>
            {deviceName}
          </Typography>
        </BackButton>
        {gMediaType.isMobile ? (
          <IconButton onClick={() => navigateToDeviceSetting(device)} disableRipple>
            <MoreHoriz sx={{ color: 'black' }} />
          </IconButton>
        ) : null}
      </PageHeader>
      <Grid2
        container
        spacing={2}
        sx={{
          py: gMediaType.isMobile ? 0 : 2,
          px: gMediaType.isMobile ? 0 : 4,
          ...(gMediaType.isMobile && { flex: 1, minHeight: 0, overflow: 'hidden' }),
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
          <Grid2 size={12} sx={{ height: '100%', minHeight: 0 }}>
            <DeviceHistory fullHeight={false} />
          </Grid2>
        ) : (
          <>
            <Grid2 size={4} sx={{ height: '560px', overflowY: 'auto' }}>
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
