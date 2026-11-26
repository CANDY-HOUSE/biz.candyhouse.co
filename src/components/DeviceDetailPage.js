import { useContext, useEffect, useMemo } from 'react';
import { Box, IconButton } from '@mui/material';
import { MoreHoriz } from '@mui/icons-material';
import { createSearchParams, useNavigate, useSearchParams } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { gConfig } from '@constants/gConfig';
import { gUtils } from '@/utils/gUtils';
import { isAppHome } from '@/services/deviceService';
import { deviceDetailFor } from '@/services/deviceDetail';
import { useNavigateUtils } from '@/hooks/useNavigateUtils';
import { PATHS } from '@/routes/manifest';
import PageHeader from './PageHeader';
import DeviceDetailPanel from './DeviceDetailPanel';
import DeviceHistory from './DeviceHistory';
import DeviceSetting from './DeviceSetting';
import MobileWifiModule from './MobileWifiModule';
import Face3DevicePanel from './vision/Face3DevicePanel';

// The phone layout keeps the page to the viewport and scrolls inside its one section.
const phonePageSx = {
  bgcolor: 'background.paper',
  overscrollBehavior: 'none',
  height: 'var(--page-viewport-height, 100dvh)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

// What the old page grid gave each section's root: a white, full-height box.
const sectionSx = (scroll) => ({
  '& > .MuiBox-root, & > .MuiCard-root': {
    backgroundColor: 'white',
    height: '100%',
    ...(scroll && { overflow: 'auto' }),
  },
});

const useDeviceQuery = () => {
  const { gManageDevice } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const did = searchParams.get('deviceUUID') || '';
  const device = useMemo(
    () => gManageDevice.companyDevices.find((item) => item.deviceUUID?.toUpperCase() === did.toUpperCase()) || {},
    [gManageDevice.companyDevices, did]
  );
  return { did, device, searchParams, deviceName: searchParams.get('deviceName') || '' };
};

// Wider than a phone, every device page is the same sectioned panel the PC list shows beside itself.
const WidePage = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ height: 'var(--page-viewport-height, 100dvh)', p: '8px 16px 16px' }}>
      <DeviceDetailPanel onBack={() => navigate(-1)} />
    </Box>
  );
};

const PhoneLockPage = () => {
  const navigate = useNavigate();
  const { navigateToDeviceSetting } = useNavigateUtils();
  const { device, deviceName } = useDeviceQuery();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <Box sx={phonePageSx}>
      <PageHeader
        sx={{ position: 'sticky', zIndex: 1100, top: 'var(--page-header-offset, 0px)' }}
        onBack={() => navigate(-1)}
        // The list carries renames made in device settings; the query keeps the name from entry.
        title={device.deviceName || deviceName}
        action={
          <IconButton onClick={() => navigateToDeviceSetting(device)} disableRipple>
            <MoreHoriz sx={{ color: 'black' }} />
          </IconButton>
        }
      />
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', ...sectionSx(true) }}>
        <DeviceHistory fullHeight={false} />
      </Box>
    </Box>
  );
};

const PhoneRegionPage = () => {
  const navigate = useNavigate();
  const { navigateToDeviceSetting } = useNavigateUtils();
  const { did, device, deviceName, searchParams } = useDeviceQuery();
  const isFace3 = (device.deviceModel || searchParams.get('deviceModel')) === gConfig.sesameDeviceModel.sesame_face_3;
  const isOps = gUtils.isOPSModel(device.deviceModel);
  const keyLevel = device.keyLevel ?? searchParams.get('keyLevel');
  const openFace3Setting = () =>
    navigate({
      pathname: PATHS.deviceSetting.index,
      search: createSearchParams({
        ...(isAppHome ? { appHome: '1', fromType: 'app' } : {}),
        deviceUUID: did,
        keyLevel: String(keyLevel ?? ''),
        deviceModel: gConfig.sesameDeviceModel.sesame_face_3,
        deviceName: device.deviceName || deviceName,
      }).toString(),
    });
  return (
    <Box sx={phonePageSx}>
      {/* The root is a fixed-height overflow container, so sticky must use top 0, not the browser bar offset. */}
      <PageHeader
        sx={{ position: 'sticky', zIndex: 1100, top: 0 }}
        onBack={() => navigate(-1)}
        title={deviceName}
        action={
          (isOps || isFace3) && (
            <IconButton onClick={() => (isFace3 ? openFace3Setting() : navigateToDeviceSetting(device))} disableRipple>
              <MoreHoriz sx={{ color: 'black' }} />
            </IconButton>
          )
        }
      />
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', ...sectionSx(false) }}>
        {isFace3 ? (
          <Box sx={{ height: '100%', overflowY: 'auto' }}>
            <Face3DevicePanel deviceUUID={did} deviceName={device.deviceName || deviceName} keyLevel={keyLevel} />
          </Box>
        ) : isOps ? (
          <DeviceHistory fullHeight={false} />
        ) : (
          <DeviceSetting showBack={false} />
        )}
      </Box>
    </Box>
  );
};

const PhoneHubPage = () => {
  const navigate = useNavigate();
  const { deviceName } = useDeviceQuery();
  return (
    <Box sx={{ bgcolor: 'background.paper', overscrollBehavior: 'none', minHeight: '100vh' }}>
      <PageHeader
        sx={{ position: 'sticky', zIndex: 1100, top: 'var(--page-header-offset, 0px)' }}
        onBack={() => navigate(-1)}
        title={deviceName}
      />
      <Box sx={{ py: 2, ...sectionSx(true) }}>
        <MobileWifiModule />
      </Box>
    </Box>
  );
};

const useWide = () => {
  const { gMediaType } = useContext(GlobalStateContext);
  return !isAppHome && !gMediaType.isMobile;
};

export function LockDetailPage() {
  return useWide() ? <WidePage /> : <PhoneLockPage />;
}

export function RegionDetailPage() {
  return useWide() ? <WidePage /> : <PhoneRegionPage />;
}

export function HubDetailPage() {
  const wide = useWide();
  const { gManageDevice } = useContext(GlobalStateContext);
  const { did, searchParams } = useDeviceQuery();
  const model = deviceDetailFor(did, gManageDevice.deviceStatus, gManageDevice.companyDevices).deviceModel;
  // The APP Hub page and WM2 draw their own header so the Wi-Fi drawer can cover it.
  if (isAppHome || model === 'wm_2' || searchParams.get('deviceModel') === 'wm_2') return <MobileWifiModule />;
  return wide ? <WidePage /> : <PhoneHubPage />;
}
