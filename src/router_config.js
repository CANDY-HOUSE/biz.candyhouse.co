import SesameAccessControlDeviceIndex from '@biz/access-control/index/index';
import SesameAccessControlDeviceRegion from '@biz/access-control/region/region';
import Passwords from '@biz/access-control/password/passwords';
import PasswordDetails from '@biz/access-control/password/passworddetails';
import VCards from '@biz/access-control/cards/cards';
import EmployeeList from '@biz/employees/list/EmployeeList';
import EmployeeGroups from '@biz/employees/group/EmployeeGroups';
import EmployeeRoles from '@biz/employees/role/EmployeeRoles';
import DeviceList from '@biz/devices/list/DeviceList';
import DeviceGroup from '@biz/devices/group/DeviceGroup';
import HistoryList from '@biz/history';
import Cards from '@biz/cards';
import Developer from '@biz/developer';
import EmployeeItem from '@biz/employees/list-item/EmployeeItem';
import DeviceGroupItem from '@biz/devices/group-item/DeviceGroupItem';
import DeviceShare from '@biz/devices/device-share/DeviceShare';
import GroupShare from '@biz/devices/group-share/GroupShare';
import DeviceItem from '@biz/devices/list-item/DeviceItem';
import EmployeeGroupItem from '@biz/employees/group-item/EmployeeGroupItem';
import CardDetails from '@biz/cards/details/carddetails';
import DeviceHistory from '@/components/DeviceHistory';
import DeviceUserList from '@/components/DeviceUserList';
import {
  SesameMobileBatteryChart,
  SesameMobileContactAdd,
  SesameMobileDeviceModifyName,
  SesameMobileDeviceSetting,
  SesameMobileDeviceShareQRCode,
  SesameMobileMeIndex,
  SesameMobileNotifyCenter,
} from './components/index';
import Contacts from '@personal/contacts';
import Me from '@personal/me';
import Devices from '@personal/devices';
import BizHomePage from '@biz/home';
import IrTypeList from '@/pages/personal/devices/wifi-module/ir/ir-type-list';
import RemoteList from '@/pages/personal/devices/wifi-module/ir/remote-list';
import RemoteAir from '@/pages/personal/devices/wifi-module/ir/remote-air';
import RemoteNonAir from '@/pages/personal/devices/wifi-module/ir/remote-non-air';
import RemoteMatch from '@/pages/personal/devices/wifi-module/ir/remote-match';
import Learn from '@/pages/personal/devices/wifi-module/ir/learn';
import UpgradeSSMFirmware from '@components/biz/device/UpgradeSSMFirmware';
import MobileWifiModule from '@/components/MobileWifiModule';
import WifiModuleIndex from '@/pages/personal/devices/wifi-module';
import DeviceSetting from './components/DeviceSetting';

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
      { router: 'list', component: DeviceList },
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
      { router: 'index', component: SesameAccessControlDeviceIndex },
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
    component: HistoryList,
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
