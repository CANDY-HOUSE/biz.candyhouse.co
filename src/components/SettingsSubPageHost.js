import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { PATHS } from '@/routes/manifest';
import deferredComponent from '@/components/deferredComponent';
import FactoryInfoDetail from '@/pages/biz/devices/factory-info';
import UpgradeSSMFirmware from '@/components/biz/device/UpgradeSSMFirmware';
import DeviceUserList from './DeviceUserList';
import MobileBatteryChart from './MobileBatteryChart';
import MobileDeviceModifyName from './MobileDeviceModifyName';
import MobileDeviceShareQRCode from './MobileDeviceShareQRCode';
import { SettingsSubPageContext, useSettingsBack, useSettingsSearchParams } from './settingsSubPage';
import { LockAngle } from './AppLockAngle';
import { BotScript } from './AppBotScript';
import { Credentials } from './AppCredentials';

const Cards = deferredComponent(() => import('@biz/access-control/cards/cards'));
const Passwords = deferredComponent(() => import('@biz/access-control/password/passwords'));
const PasswordDetails = deferredComponent(() => import('@biz/access-control/password/passworddetails'));
const CardDetails = deferredComponent(() => import('@biz/cards/details/carddetails'));

// The APP routes of these pages read the URL; in the column they take the query they were opened with.
const embedded = (render) =>
  function EmbeddedPage() {
    const [params] = useSettingsSearchParams();
    const back = useSettingsBack();
    return render(params, back);
  };
const EmbeddedAngle = embedded((params, back) => (
  <LockAngle deviceUUID={params.get('deviceUUID') || ''} embedded onBack={back} />
));
const EmbeddedScript = embedded((params, back) => (
  <BotScript deviceUUID={params.get('deviceUUID') || ''} index={Number(params.get('index'))} embedded onBack={back} />
));
const EmbeddedCredentials = embedded((params, back) => (
  <Credentials
    deviceUUID={params.get('deviceUUID') || ''}
    kind={params.get('kind') || ''}
    deviceModel={params.get('deviceModel')}
    embedded
    onBack={back}
  />
));

const pages = {
  [PATHS.deviceSetting.user]: DeviceUserList,
  [PATHS.deviceSetting.rename]: MobileDeviceModifyName,
  [PATHS.deviceSetting.share]: MobileDeviceShareQRCode,
  [PATHS.deviceSetting.batteryTrend]: MobileBatteryChart,
  [PATHS.deviceSetting.factoryInfo]: FactoryInfoDetail,
  [PATHS.hub.ssmUpgrade]: UpgradeSSMFirmware,
  [PATHS.accessControl.cards]: Cards,
  [PATHS.accessControl.passwords]: Passwords,
  [PATHS.accessControl.passwordDetails]: PasswordDetails,
  [PATHS.cards.details]: CardDetails,
  [PATHS.deviceSetting.angle]: EmbeddedAngle,
  [PATHS.deviceSetting.botScript]: EmbeddedScript,
  [PATHS.deviceSetting.credentials]: EmbeddedCredentials,
};

// Wraps a device's settings in the PC detail panel; pages open here one level at a time and back returns a level.
export default function SettingsSubPageHost({ children }) {
  const [stack, setStack] = useState([]);
  const page = stack[stack.length - 1];
  const value = useMemo(
    () => ({
      page,
      open: (pathname, search, state) =>
        setStack((current) => [...current, { pathname, params: new URLSearchParams(search), state }]),
      close: () => setStack((current) => current.slice(0, -1)),
      replaceParams: (params) =>
        setStack((current) => [
          ...current.slice(0, -1),
          { ...current[current.length - 1], params: new URLSearchParams(params) },
        ]),
    }),
    [page]
  );
  const Page = page && pages[page.pathname];
  return (
    <SettingsSubPageContext.Provider value={value}>
      {Page ? (
        <Box sx={{ height: '100%', overflow: 'auto', bgcolor: 'background.paper' }}>
          <Page key={stack.length} />
        </Box>
      ) : (
        children
      )}
    </SettingsSubPageContext.Provider>
  );
}
