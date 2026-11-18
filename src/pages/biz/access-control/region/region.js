import PageHeader from '@/components/PageHeader';
import React, { useContext, useMemo, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Box, IconButton, Typography, Grid2 } from '@mui/material';
import { createSearchParams, useNavigate, useSearchParams } from 'react-router-dom';
import CfpContent from '@/components/biz/device/CfpContent';
import { gConfig } from '@constants/gConfig';
import { gUtils } from '@/utils/gUtils';
import DeviceUserList from '@/components/DeviceUserList';
import { useTranslation } from 'react-i18next';
import MobileBatteryChart from '@/components/MobileBatteryChart';
import DeviceSetting from '@/components/DeviceSetting';
import DeviceHistory from '@/components/DeviceHistory';
import { useNavigateUtils } from '@/hooks/useNavigateUtils';
import { MoreHoriz } from '@mui/icons-material';
import { isAppHome } from '@/services/deviceService';
import { useCredentialCounts } from '@/hooks/useBleSnapshot';
import { Credentials } from '@/components/AppCredentials';
import Face3DevicePanel from '@/components/vision/Face3DevicePanel';

export default function SesameAccessControlDeviceRegion() {
  const navigate = useNavigate();
  const { gManageDevice, gMediaType } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const { navigateToDeviceSetting } = useNavigateUtils();
  const [searchParams] = useSearchParams();
  const did = searchParams.get('deviceUUID') || '';
  const deviceName = searchParams.get('deviceName') || '';

  const device = useMemo(() => {
    return gManageDevice.companyDevices.find((item) => item.deviceUUID === did) || {};
  }, [gManageDevice.companyDevices, did]);
  const hasHistory = gUtils.isOPSModel(device.deviceModel);
  const webCounts = !isAppHome && gUtils.isSesameAccessControlDevice(device.deviceModel);
  const counts = useCredentialCounts(webCounts ? did : null, device.deviceModel);
  const [credential, setCredential] = useState(null);
  const credentialKinds = {
    [gConfig.sesameTouchProAuthType.finger]: 'fingerprint',
    [gConfig.sesameTouchProAuthType.face]: 'face',
    [gConfig.sesameTouchProAuthType.palm]: 'palm',
  };
  const count = (kind, fallback) =>
    !webCounts
      ? fallback
      : counts[kind] === undefined
        ? '—'
        : (counts[kind] ?? (kind === 'card' || kind === 'passcode' ? fallback : '—'));

  /* Face3：新增「录像」卡片（录像、AI 开关、人脸掌纹迁移）。PC 放在电池电量之上；
     手机上本页默认显示录像，设置走页头 ⋯（与开关传感器默认显示履历同样的做法）。 */
  const isFace3 = (device.deviceModel || searchParams.get('deviceModel')) === gConfig.sesameDeviceModel.sesame_face_3;
  const openFace3Setting = () =>
    navigate({
      pathname: '/device-setting',
      search: createSearchParams({
        ...(isAppHome ? { appHome: '1', fromType: 'app' } : {}),
        deviceUUID: did,
        keyLevel: String(device.keyLevel ?? searchParams.get('keyLevel') ?? ''),
        deviceModel: gConfig.sesameDeviceModel.sesame_face_3,
        deviceName: device.deviceName || deviceName,
      }).toString(),
    });

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
      {/* 手机上本页根节点是 overflow: hidden 的定高容器，sticky 以它为参照：
          top 只能是 0。若用 --page-header-offset（端外浏览器为顶栏高度 60px），
          页头会被整体下推 60px，上面露出空白和下方画面的一截。 */}
      <PageHeader
        sx={{
          position: gMediaType.isMobile ? 'sticky' : 'static',
          zIndex: gMediaType.isMobile ? 1100 : 'auto',
          top: 0,
        }}
        onBack={() => navigate(-1)}
        title={deviceName}
        action={
          gMediaType.isMobile &&
          (gUtils.isOPSModel(device.deviceModel) || isFace3) && (
            <IconButton onClick={() => (isFace3 ? openFace3Setting() : navigateToDeviceSetting(device))} disableRipple>
              <MoreHoriz sx={{ color: 'black' }} />
            </IconButton>
          )
        }
      />
      <Grid2
        container
        spacing={2}
        sx={{
          py: gMediaType.isMobile ? 0 : 2,
          px: gMediaType.isMobile ? 0 : 4,
          ...(gMediaType.isMobile && { flex: 1, minHeight: 0, overflow: 'hidden' }),
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
          <Grid2 size={12} sx={{ height: '100%', minHeight: 0 }}>
            {isFace3 ? (
              <Box sx={{ height: '100%', overflowY: 'auto' }}>
                <Face3DevicePanel deviceUUID={did} deviceName={device.deviceName || deviceName} />
              </Box>
            ) : gUtils.isOPSModel(device.deviceModel) ? (
              <DeviceHistory fullHeight={false} />
            ) : (
              <DeviceSetting showBack={false} />
            )}
          </Grid2>
        ) : (
          <>
            <Grid2 size={hasHistory ? 4 : 6} sx={{ height: '500px', overflowY: 'auto' }}>
              <Box>
                <Typography variant="h4">{t('deviceMember.user')}</Typography>
                <DeviceUserList deviceUUID={did} defaultManageMode />
              </Box>
            </Grid2>
            {hasHistory && (
              <Grid2 size={4} sx={{ height: '500px' }}>
                <Box>
                  <Typography variant="h4">{t('pages.sesameAccessControlDevice.index.history', '履歴')}</Typography>
                  <DeviceHistory deviceUUID={did} showToolBar />
                </Box>
              </Grid2>
            )}
            <Grid2 size={hasHistory ? 4 : 6} sx={{ height: '500px' }}>
              {credential?.did === did ? (
                <Box>
                  <Credentials
                    key={credential.kind}
                    deviceUUID={did}
                    kind={credential.kind}
                    deviceModel={device.deviceModel}
                    embedded
                    onBack={() => setCredential(null)}
                  />
                </Box>
              ) : (
                <DeviceSetting showBack={false} />
              )}
            </Grid2>
            {isFace3 && (
              <Grid2 size={12}>
                <Box sx={{ overflow: 'hidden' }}>
                  <Face3DevicePanel deviceUUID={did} deviceName={device.deviceName || deviceName} />
                </Box>
              </Grid2>
            )}
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
                    cc={count('card', device.stateInfo?.cards_num || 0)}
                    pc={count('passcode', device.stateInfo?.keyboards_num || 0)}
                    {...(webCounts && {
                      fc: count('fingerprint'),
                      faceCount: count('face'),
                      palmCount: count('palm'),
                    })}
                    call={(type) => {
                      if (credentialKinds[type]) {
                        if (!webCounts) return;
                        setCredential({ did, kind: credentialKinds[type] });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        return;
                      }
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
