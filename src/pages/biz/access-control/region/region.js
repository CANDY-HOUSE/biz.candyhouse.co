import React, { useContext, useMemo } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Box, IconButton, Typography, Grid2 } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CfpContent from '@/components/biz/device/CfpContent';
import { gConfig } from '@constants/gConfig';
import { gUtils } from '@/utils/gUtils';
import DeviceUserList from '@/components/DeviceUserList';
import { useTranslation } from 'react-i18next';
import MobileBindDevice from '@/components/MobileBindDevice';
import MobileBatteryChart from '@/components/MobileBatteryChart';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import DeviceSetting from '@/components/DeviceSetting';

export default function SesameAccessControlDeviceRegion() {
  const navigate = useNavigate();
  const { gManageDevice, gMediaType } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const did = searchParams.get('deviceUUID') || '';
  const deviceName = searchParams.get('deviceName') || '';

  const device = useMemo(() => {
    return gManageDevice.companyDevices.find((item) => item.deviceUUID === did) || {};
  }, [gManageDevice.companyDevices, did]);

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
        spacing={3}
        sx={{
          py: 2,
          px: gMediaType.isMobile ? 0 : 4,
          '& > *': {
            '& > .MuiBox-root, & > .MuiCard-root': {
              backgroundColor: 'white',
              height: '100%',
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
            <DeviceSetting showBack={false} />
          </Grid2>
        ) : (
          <>
            <Grid2 size={4}>
              <Box>
                <Typography variant="h4">{t('deviceMember.user')}</Typography>
                <DeviceUserList deviceUUID={did} defaultManageMode />
              </Box>
            </Grid2>
            <Grid2 size={4} sx={{ height: '500px' }}>
              <Box>
                <Typography variant="h4">{t('連携済みセサミ')}</Typography>
                <Box sx={{ px: 2 }}>
                  <MobileBindDevice device={device} editable={false} />
                </Box>
              </Box>
            </Grid2>
            <Grid2 size={4} sx={{ height: '500px' }}>
              <DeviceSetting />
            </Grid2>
            <Grid2 size={12}>
              <Box>
                <Typography variant="h4">{t('pages.sesameAccessControlDevice.index.Battery')}</Typography>
                <MobileBatteryChart deviceUUID={did} />
              </Box>
            </Grid2>
            {gUtils.isSesameAccessControlDevice(device.deviceModel) && (
              <Grid2 size={{ xs: 12, md: 12 }} sx={{ height: '500px' }}>
                <Box>
                  <CfpContent
                    isMobile={gMediaType.isMobile}
                    model={device.deviceModel}
                    cc={device.stateInfo?.cards_num || 0}
                    pc={device.stateInfo?.keyboards_num || 0}
                    call={(type) => {
                      let mstate = {
                        title: device.deviceName,
                        uuid: device.deviceUUID,
                      };
                      let path = '';
                      if (type === gConfig.sesameTouchProAuthType.card) {
                        path = '/biz/access-control/cards';
                      } else if (type === gConfig.sesameTouchProAuthType.password) {
                        path = '/biz/access-control/passwords';
                      }
                      navigate(path, { state: mstate });
                    }}
                  />
                </Box>
              </Grid2>
            )}
          </>
        )}
      </Grid2>
    </Box>
  );
}
