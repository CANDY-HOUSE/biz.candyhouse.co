import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import deferredComponent from '@/components/deferredComponent';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { isAppHome } from '@/services/deviceService';
import AppCredentials from '@/components/AppCredentials';
import AppBotScript from '@/components/AppBotScript';
import DeviceHistory from '@/components/DeviceHistory';
import DeviceUserList from '@/components/DeviceUserList';
import MobileWifiModule from '@/components/MobileWifiModule';
import AppRegistration from '@/components/AppRegistration';
import DeviceSetting from '@/components/DeviceSetting';
import AppAutoUnlock from '@/components/AppAutoUnlock';
import AppLockAngle from '@/components/AppLockAngle';
import { HubDetailPage, LockDetailPage, RegionDetailPage } from '@/components/DeviceDetailPage';
import {
  SesameMobileBatteryChart,
  SesameMobileContactAdd,
  SesameMobileDeviceModifyName,
  SesameMobileDeviceSetting,
  SesameMobileDeviceShareQRCode,
  SesameMobileMeIndex,
  SesameMobileNotifyCenter,
  SesameMobileMyHomepage,
} from '@/components/index';
import IrTypeList from '@/pages/personal/devices/wifi-module/ir/ir-type-list';
import Learn from '@/pages/personal/devices/wifi-module/ir/learn';
import RemoteAir from '@/pages/personal/devices/wifi-module/ir/remote-air';
import RemoteList from '@/pages/personal/devices/wifi-module/ir/remote-list';
import RemoteMatch from '@/pages/personal/devices/wifi-module/ir/remote-match';
import RemoteNonAir from '@/pages/personal/devices/wifi-module/ir/remote-non-air';
import FactoryInfoDetail from '@biz/devices/factory-info';
import Vision from '@biz/vision';
import UpgradeSSMFirmware from '@components/biz/device/UpgradeSSMFirmware';
import MemberList from '@/components/MemberList';
import Devices from '@personal/devices';
import Me from '@personal/me';
import { PATHS as P, ROUTES } from './manifest';

const VCards = deferredComponent(() => import('@biz/access-control/cards/cards'));
const PasswordDetails = deferredComponent(() => import('@biz/access-control/password/passworddetails'));
const Passwords = deferredComponent(() => import('@biz/access-control/password/passwords'));
const Cards = deferredComponent(() => import('@biz/cards'));
const CardDetails = deferredComponent(() => import('@biz/cards/details/carddetails'));
const Developer = deferredComponent(() => import('@biz/developer'));
const EnvSnapshotDetail = deferredComponent(() => import('@biz/history/env-snapshot'));
const DeviceShare = deferredComponent(() => import('@biz/devices/device-share/DeviceShare'));
const DeviceGroupItem = deferredComponent(() => import('@biz/devices/group-item/DeviceGroupItem'));
const GroupShare = deferredComponent(() => import('@biz/devices/group-share/GroupShare'));
const DeviceGroup = deferredComponent(() => import('@biz/devices/group/DeviceGroup'));
const EmployeeGroupItem = deferredComponent(() => import('@biz/employees/group-item/EmployeeGroupItem'));
const EmployeeGroups = deferredComponent(() => import('@biz/employees/group/EmployeeGroups'));
const EmployeeItem = deferredComponent(() => import('@biz/employees/list-item/EmployeeItem'));
const EmployeeRoles = deferredComponent(() => import('@biz/employees/role/EmployeeRoles'));
const HistoryList = deferredComponent(() => import('@biz/history'));
const BizHomePage = deferredComponent(() => import('@biz/home'));
const ScheduleList = deferredComponent(() => import('@biz/schedule-list'));
const Settings = deferredComponent(() => import('@biz/settings'));

const DoorList = () => <Devices category="doors" />;
// A company space opens on its own home page; a bare / with a device query still shows that device.
const RootPage = () => {
  const { gStripe } = useContext(GlobalStateContext);
  const location = useLocation();
  const companySpace =
    !isAppHome && !gStripe.isFromApp && gStripe.customerInfo.companyID && !gStripe.customerInfo.isSesameApp;
  if (companySpace && !location.search) return <Navigate to={P.bizHome} replace />;
  return <Devices />;
};
const AuthenticatorList = () => <Devices category="authenticators" />;

const components = {
  [P.root]: RootPage,
  [P.appRegister]: AppRegistration,
  [P.bizHome]: BizHomePage,
  [P.settings]: Settings,
  [P.contacts]: MemberList,
  [P.contactAdd]: SesameMobileContactAdd,
  [P.me]: Me,
  [P.meIndex]: SesameMobileMeIndex,
  [P.meHomepage]: SesameMobileMyHomepage,
  [P.vision]: Vision,
  [P.members.list]: MemberList,
  [P.members.item]: EmployeeItem,
  [P.members.group]: EmployeeGroups,
  [P.members.groupItem]: EmployeeGroupItem,
  [P.members.role]: EmployeeRoles,
  [P.doors.list]: DoorList,
  [P.doors.item]: LockDetailPage,
  [P.doors.share]: DeviceShare,
  [P.doors.groupShare]: GroupShare,
  [P.doors.group]: DeviceGroup,
  [P.doors.groupItem]: DeviceGroupItem,
  [P.accessControl.index]: AuthenticatorList,
  [P.accessControl.region]: RegionDetailPage,
  [P.accessControl.cards]: VCards,
  [P.accessControl.passwords]: Passwords,
  [P.accessControl.passwordDetails]: PasswordDetails,
  [P.ir.type]: IrTypeList,
  [P.ir.remotes]: RemoteList,
  [P.ir.air]: RemoteAir,
  [P.ir.nonAir]: RemoteNonAir,
  [P.ir.match]: RemoteMatch,
  [P.ir.learn]: Learn,
  [P.cards.index]: Cards,
  [P.cards.details]: CardDetails,
  [P.history.index]: HistoryList,
  [P.history.envSnapshot]: EnvSnapshotDetail,
  [P.scheduleList]: ScheduleList,
  [P.developer]: Developer,
  [P.deviceHistory]: DeviceHistory,
  [P.deviceNotify]: SesameMobileNotifyCenter,
  [P.deviceSetting.index]: DeviceSetting,
  [P.deviceSetting.angle]: AppLockAngle,
  [P.deviceSetting.credentials]: AppCredentials,
  [P.deviceSetting.botScript]: AppBotScript,
  [P.deviceSetting.autoUnlock]: AppAutoUnlock,
  [P.deviceSetting.legacyIndex]: SesameMobileDeviceSetting,
  [P.deviceSetting.user]: DeviceUserList,
  [P.deviceSetting.rename]: SesameMobileDeviceModifyName,
  [P.deviceSetting.share]: SesameMobileDeviceShareQRCode,
  [P.deviceSetting.batteryTrend]: SesameMobileBatteryChart,
  [P.deviceSetting.factoryInfo]: FactoryInfoDetail,
  [P.hub.legacyRoot]: MobileWifiModule,
  [P.hub.index]: HubDetailPage,
  [P.hub.ssmUpgrade]: UpgradeSSMFirmware,
};

export const pageRoutes = ROUTES.map((route) => ({ ...route, component: components[route.path] }));
