import DeviceHistory from '@/components/DeviceHistory';
import DeviceUserList from '@/components/DeviceUserList';
import MobileWifiModule from '@/components/MobileWifiModule';
import WifiModuleIndex from '@/pages/personal/devices/wifi-module';
import IrTypeList from '@/pages/personal/devices/wifi-module/ir/ir-type-list';
import Learn from '@/pages/personal/devices/wifi-module/ir/learn';
import RemoteAir from '@/pages/personal/devices/wifi-module/ir/remote-air';
import RemoteList from '@/pages/personal/devices/wifi-module/ir/remote-list';
import RemoteMatch from '@/pages/personal/devices/wifi-module/ir/remote-match';
import RemoteNonAir from '@/pages/personal/devices/wifi-module/ir/remote-non-air';
import VCards from '@biz/access-control/cards/cards';
import PasswordDetails from '@biz/access-control/password/passworddetails';
import Passwords from '@biz/access-control/password/passwords';
import SesameAccessControlDeviceRegion from '@biz/access-control/region/region';
import Cards from '@biz/cards';
import CardDetails from '@biz/cards/details/carddetails';
import Developer from '@biz/developer';
import EnvSnapshotDetail from '@biz/history/env-snapshot';
import DeviceShare from '@biz/devices/device-share/DeviceShare';
import DeviceGroupItem from '@biz/devices/group-item/DeviceGroupItem';
import GroupShare from '@biz/devices/group-share/GroupShare';
import DeviceGroup from '@biz/devices/group/DeviceGroup';
import DeviceItem from '@biz/devices/list-item/DeviceItem';
import FactoryInfoDetail from '@biz/devices/factory-info';
import EmployeeGroupItem from '@biz/employees/group-item/EmployeeGroupItem';
import EmployeeGroups from '@biz/employees/group/EmployeeGroups';
import EmployeeItem from '@biz/employees/list-item/EmployeeItem';
import EmployeeList from '@biz/employees/list/EmployeeList';
import EmployeeRoles from '@biz/employees/role/EmployeeRoles';
import HistoryList from '@biz/history';
import BizHomePage from '@biz/home';
import ScheduleList from '@biz/schedule-list';
import Vision from '@biz/vision';
import UpgradeSSMFirmware from '@components/biz/device/UpgradeSSMFirmware';
import Contacts from '@personal/contacts';
import Devices from '@personal/devices';
import Me from '@personal/me';
import DeviceSetting from './components/DeviceSetting';
import {
  SesameMobileBatteryChart,
  SesameMobileContactAdd,
  SesameMobileDeviceModifyName,
  SesameMobileDeviceSetting,
  SesameMobileDeviceShareQRCode,
  SesameMobileMeIndex,
  SesameMobileNotifyCenter,
} from './components/index';

// 与 gUtils.categoriesConf 对应
const routerComponentMap = [
  {
    router: '/',
    component: Devices,
  },
  {
    router: '/contacts',
    component: Contacts,
  },
  {
    router: '/contact-add',
    component: SesameMobileContactAdd,
    load: true,
  },
  {
    router: '/me',
    components: [
      { router: 'index', component: SesameMobileMeIndex },
      { router: '', component: Me },
    ],
  },
  {
    router: '/biz',
    component: BizHomePage,
  },
  {
    router: '/vision',
    components: [{ router: '', component: Vision }],
  },
  {
    router: '/biz/employees',
    components: [
      { router: 'list', component: EmployeeList },
      { router: 'list-item', component: EmployeeItem },
      { router: 'group', component: EmployeeGroups },
      { router: 'group-item', component: EmployeeGroupItem },
      { router: 'role', component: EmployeeRoles },
    ],
  },
  {
    router: '/biz/devices',
    components: [
      { router: 'list', component: Devices },
      { router: 'list-item', component: DeviceItem },
      { router: 'device-share', component: DeviceShare },
      { router: 'group-share', component: GroupShare },
      { router: 'group', component: DeviceGroup },
      { router: 'group-item', component: DeviceGroupItem },
    ],
  },
  {
    router: '/biz/access-control',
    components: [
      { router: 'index', component: Devices },
      { router: 'region', component: SesameAccessControlDeviceRegion },
      { router: 'cards', component: VCards },
      { router: 'passwords', component: Passwords },
      { router: 'password-details', component: PasswordDetails },
      { router: 'ir-type', component: IrTypeList },
      { router: 'remotes', component: RemoteList },
      { router: 'remote-air', component: RemoteAir },
      { router: 'remote-non-air', component: RemoteNonAir },
      { router: 'remote-match', component: RemoteMatch },
      { router: 'learn', component: Learn },
    ],
  },
  {
    router: '/biz/cards',
    components: [
      { router: '', component: Cards },
      { router: 'details', component: CardDetails },
    ],
  },
  {
    router: '/biz/history',
    components: [
      { router: '', component: HistoryList },
      { router: 'env-snapshot', component: EnvSnapshotDetail },
    ],
  },
  {
    router: '/biz/schedule-list',
    component: ScheduleList,
  },
  {
    router: '/biz/developer',
    component: Developer,
  },
  {
    router: '/device-history',
    component: DeviceHistory,
    load: true,
  },
  {
    router: '/device-notify',
    component: SesameMobileNotifyCenter,
    load: true,
  },
  {
    router: '/device-setting',
    components: [
      { router: '', component: DeviceSetting },
      { router: 'index', component: SesameMobileDeviceSetting },
      { router: 'user', component: DeviceUserList },
      { router: 'rename', component: SesameMobileDeviceModifyName },
      { router: 'share', component: SesameMobileDeviceShareQRCode },
      { router: 'battery-trend', component: SesameMobileBatteryChart },
      { router: 'factory-info', component: FactoryInfoDetail },
    ],
    load: true,
  },
  {
    router: '/biz/wifi-module',
    components: [
      { router: '', component: MobileWifiModule },
      { router: 'index', component: WifiModuleIndex },
      { router: 'ssm-upgrade', component: UpgradeSSMFirmware },
    ],
    load: true,
  },
];

export { routerComponentMap };
