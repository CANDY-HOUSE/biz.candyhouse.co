import { useContext, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { deviceModelDisplayName } from '@/constants/sesameDeviceModel';
import { ios } from '@/theme/appHomeStyle';
import { gConfig } from '@constants/gConfig';
import { gUtils } from '@/utils/gUtils';
import { deviceDetailFor } from '@/services/deviceDetail';
import { deviceDetailPath } from '@/hooks/useNavigateUtils';
import { Hub3Connected } from '@/pages/personal/devices/wifi-module';
import DeviceHistory from './DeviceHistory';
import DeviceUserList from './DeviceUserList';
import DeviceSetting from './DeviceSetting';
import MobileBatteryChart from './MobileBatteryChart';
import MobileWifiModule from './MobileWifiModule';
import CredentialSummary from './biz/device/CredentialSummary';
import { Credentials } from './AppCredentials';
import Face3DevicePanel from './vision/Face3DevicePanel';

const tabLabels = {
  history: (t) => t('pages.sesameAccessControlDevice.index.history', '履歴'),
  users: (t) => t('deviceMember.user'),
  settings: (t) => t('navigator.Settings'),
  battery: (t) => t('pages.sesameAccessControlDevice.index.Battery'),
  connected: (t) => t('pages.sesameAccessControlDevice.index.connectedIRDevices'),
  face3: (t) => t('navigator.Vision'),
  // CfpContent's own heading, which is not translated either.
  credentials: () => '登録内容',
};

// The same sections the device's own page shows on PC, in the same order.
const sectionsFor = (model, keyLevel) => {
  const path = deviceDetailPath({ deviceModel: model, keyLevel });
  if (path === '/biz/wifi-module/index')
    return model === 'wm_2' ? ['settings'] : ['users', 'connected', 'settings', 'battery'];
  if (path !== '/biz/access-control/region') return ['users', 'history', 'settings', 'battery'];
  if (model === gConfig.sesameDeviceModel.sesame_face_3) return ['face3', 'users', 'settings', 'battery'];
  if (gUtils.isOPSModel(model)) return ['users', 'history', 'settings', 'battery'];
  if (gUtils.isSesameAccessControlDevice(model)) return ['users', 'settings', 'battery', 'credentials'];
  return ['users', 'settings', 'battery'];
};

// The device page's sections side by side with the list; like the page, they read the device from the query.
export default function DeviceDetailPanel({ onOpenPage }) {
  const { t } = useTranslation();
  const { gManageDevice } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const did = searchParams.get('deviceUUID') || '';
  const device =
    gManageDevice.companyDevices.find((item) => item.deviceUUID?.toUpperCase() === did.toUpperCase()) || {};
  const model = device.deviceModel || searchParams.get('deviceModel') || '';
  const keyLevel = device.keyLevel ?? searchParams.get('keyLevel');
  const sections = sectionsFor(model, keyLevel);
  const [picked, setTab] = useState(null);
  const tab = sections.includes(picked) ? picked : sections[0];

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: ios.card,
        borderRadius: ios.cardRadius,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ flexShrink: 0, px: '28px', pt: '22px', pb: '16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 28,
                fontWeight: 700,
                lineHeight: '36px',
                color: ios.label,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {device.deviceName || searchParams.get('deviceName')}
            </Typography>
            <Typography sx={{ mt: '2px', fontSize: 15, color: ios.secondaryLabel }}>
              {deviceModelDisplayName(model)}
            </Typography>
          </Box>
          <IconButton
            onClick={onOpenPage}
            aria-label="open"
            sx={{ mt: '2px', bgcolor: ios.fill, color: ios.secondaryLabel, '&:hover': { bgcolor: ios.separator } }}
          >
            <OpenInFullRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Box
          role="tablist"
          sx={{
            mt: '18px',
            display: sections.length > 1 ? 'flex' : 'none',
            p: '2px',
            bgcolor: ios.fill,
            borderRadius: '9px',
          }}
        >
          {sections.map((key) => (
            <ButtonBase
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              sx={{
                flex: 1,
                height: 32,
                borderRadius: '7px',
                fontSize: 14,
                fontWeight: tab === key ? 600 : 500,
                color: ios.label,
                bgcolor: tab === key ? ios.card : 'transparent',
                boxShadow: tab === key ? '0 3px 8px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
                transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {tabLabels[key](t)}
            </ButtonBase>
          ))}
        </Box>
      </Box>
      <PanelBody key={did} did={did} device={device} model={model} keyLevel={keyLevel} tab={tab} />
    </Box>
  );
}

// Keeps visited sections mounted, so switching back does not reload them.
const PanelBody = ({ did, device, model, keyLevel, tab }) => {
  const { gManageDevice } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const [visited, setVisited] = useState([tab]);
  const [credential, setCredential] = useState(null);
  if (!visited.includes(tab)) setVisited([...visited, tab]);
  const hub = model === 'wm_2' || deviceDetailPath({ deviceModel: model, keyLevel }) === '/biz/wifi-module/index';
  // Both settings views size themselves to the viewport; inside the panel they fill the pane instead.
  const fillSx = { '& > .MuiBox-root': { height: '100%' } };
  const pane = (key, children, sx) =>
    visited.includes(key) && (
      <Box sx={{ display: tab === key ? 'block' : 'none', height: '100%', overflow: 'auto', ...sx }}>{children}</Box>
    );

  return (
    <Box sx={{ flex: 1, minHeight: 0, borderTop: `0.5px solid ${ios.separator}` }}>
      {pane('history', <DeviceHistory deviceUUID={did} showToolBar fullHeight={false} fill />, { px: '12px' })}
      {pane('users', <DeviceUserList deviceUUID={did} defaultManageMode />)}
      {pane('settings', hub ? <MobileWifiModule /> : <DeviceSetting showBack={false} />, fillSx)}
      {pane('battery', <MobileBatteryChart deviceUUID={did} />)}
      {pane(
        'connected',
        <Hub3Connected
          device={deviceDetailFor(did, gManageDevice.deviceStatus, gManageDevice.companyDevices)}
          did={did}
        />
      )}
      {pane(
        'face3',
        <Face3DevicePanel
          fill
          deviceUUID={did}
          deviceName={device.deviceName || searchParams.get('deviceName')}
          keyLevel={keyLevel}
        />
      )}
      {pane(
        'credentials',
        credential ? (
          <Credentials
            key={credential}
            deviceUUID={did}
            kind={credential}
            deviceModel={model}
            embedded
            onBack={() => setCredential(null)}
          />
        ) : (
          <CredentialSummary device={device} did={did} onCredential={setCredential} />
        )
      )}
    </Box>
  );
};
