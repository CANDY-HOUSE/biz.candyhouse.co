// Pure data only: tools/check-routes.mjs loads this file without a bundler, so it must not import anything.

// Values are permission IDs stored in customerInfo.access on the server; never translate them.
export const pageNames = {
  members: 'ユーザー',
  membersGroup: 'ユーザーグループ',
  membersRole: 'ロール',
  historys: '全体履歴',
  scheduleList: '予約一覧',
  developer: '開発者向け',
  cards: 'カード管理',
  devices: 'デバイス（ドア・認証機器）',
  touchDevices: '認証機器',
  ssmDevices: 'ドア',
  ssmDevicesGroup: 'ドアグループ',
  vision: 'Vision',
  appDevices: 'セサミ',
  appContacts: '連絡先',
  appMe: '自分',
};

export const PATHS = {
  root: '/',
  login: '/login',
  appRegister: '/app/register',
  contacts: '/contacts',
  contactAdd: '/contact-add',
  me: '/me',
  meIndex: '/me/index',
  meHomepage: '/me/homepage',
  vision: '/vision',
  bizHome: '/biz',
  settings: '/biz/settings',
  members: {
    list: '/biz/employees/list',
    item: '/biz/employees/list-item',
    group: '/biz/employees/group',
    groupItem: '/biz/employees/group-item',
    role: '/biz/employees/role',
  },
  doors: {
    list: '/biz/devices/list',
    item: '/biz/devices/list-item',
    share: '/biz/devices/device-share',
    groupShare: '/biz/devices/group-share',
    group: '/biz/devices/group',
    groupItem: '/biz/devices/group-item',
  },
  accessControl: {
    index: '/biz/access-control/index',
    region: '/biz/access-control/region',
    cards: '/biz/access-control/cards',
    passwords: '/biz/access-control/passwords',
    passwordDetails: '/biz/access-control/password-details',
  },
  ir: {
    type: '/biz/wifi-module/ir/type',
    remotes: '/biz/wifi-module/ir/remotes',
    air: '/biz/wifi-module/ir/air',
    nonAir: '/biz/wifi-module/ir/non-air',
    match: '/biz/wifi-module/ir/match',
    learn: '/biz/wifi-module/ir/learn',
  },
  cards: {
    index: '/biz/cards',
    details: '/biz/cards/details',
  },
  history: {
    index: '/biz/history',
    envSnapshot: '/biz/history/env-snapshot',
  },
  scheduleList: '/biz/schedule-list',
  developer: '/biz/developer',
  deviceHistory: '/device-history',
  deviceNotify: '/device-notify',
  deviceSetting: {
    index: '/device-setting',
    angle: '/device-setting/angle',
    credentials: '/device-setting/credentials',
    botScript: '/device-setting/bot-script',
    autoUnlock: '/device-setting/auto-unlock',
    legacyIndex: '/device-setting/index',
    user: '/device-setting/user',
    rename: '/device-setting/rename',
    share: '/device-setting/share',
    batteryTrend: '/device-setting/battery-trend',
    factoryInfo: '/device-setting/factory-info',
  },
  hub: {
    legacyRoot: '/biz/wifi-module',
    index: '/biz/wifi-module/index',
    ssmUpgrade: '/biz/wifi-module/ssm-upgrade',
  },
};

/*
 * access:
 *   'fixed'  – always registered, even before customerInfo arrives
 *   'always' – registered once customerInfo.access is known
 *   'app'    – fixed, but only inside the APP shell
 *   pageNames key – registered when the space grants that page (gUtils.isContainPage)
 * appForced: also registered inside the APP shell regardless of access.
 * Flags: nativeTheme (NativePageTheme), appHeader (page draws its own APP header), pullRefresh (APP pull to refresh),
 * pcCard (PC grouped card background), guestGate (APP guests see a sign-in prompt), legacy (only the old native APP).
 */
const P = PATHS;
export const ROUTES = [
  { path: P.root, access: 'fixed', nativeTheme: true, pcCard: true },
  { path: P.appRegister, access: 'app', nativeTheme: true },
  { path: P.bizHome, access: 'fixed', pcCard: true },
  { path: P.settings, access: 'fixed', pcCard: true },

  { path: P.contacts, access: 'appContacts', appForced: true, nativeTheme: true, pcCard: true, guestGate: true },
  { path: P.contactAdd, access: 'always', nativeTheme: true, guestGate: true },
  { path: P.me, access: 'appMe', appForced: true, nativeTheme: true, pcCard: true },
  { path: P.meIndex, access: 'appMe', appForced: true, nativeTheme: true, legacy: true },
  { path: P.meHomepage, access: 'appMe', appForced: true, nativeTheme: true },
  { path: P.vision, access: 'always', nativeTheme: true, pcCard: true },

  { path: P.members.list, access: 'members' },
  { path: P.members.item, access: 'members' },
  { path: P.members.group, access: 'members' },
  { path: P.members.groupItem, access: 'members' },
  { path: P.members.role, access: 'members' },

  { path: P.doors.list, access: 'ssmDevices', pcCard: true },
  { path: P.doors.item, access: 'ssmDevices', nativeTheme: true, appHeader: true, pcCard: true },
  { path: P.doors.share, access: 'ssmDevices', pcCard: true },
  { path: P.doors.groupShare, access: 'ssmDevices' },
  { path: P.doors.group, access: 'ssmDevices' },
  { path: P.doors.groupItem, access: 'ssmDevices' },

  { path: P.accessControl.index, access: 'touchDevices', pcCard: true },
  { path: P.accessControl.region, access: 'touchDevices', nativeTheme: true, appHeader: true, pcCard: true },
  { path: P.accessControl.cards, access: 'touchDevices' },
  { path: P.accessControl.passwords, access: 'touchDevices' },
  { path: P.accessControl.passwordDetails, access: 'touchDevices' },

  { path: P.cards.index, access: 'cards' },
  { path: P.cards.details, access: 'cards' },
  { path: P.history.index, access: 'historys', pcCard: true },
  { path: P.history.envSnapshot, access: 'historys' },
  { path: P.scheduleList, access: 'scheduleList', pcCard: true },
  { path: P.developer, access: 'developer', pcCard: true },

  { path: P.deviceHistory, access: 'always', nativeTheme: true, appHeader: true, legacy: true },
  { path: P.deviceNotify, access: 'always', nativeTheme: true },
  { path: P.deviceSetting.index, access: 'always', nativeTheme: true, appHeader: true },
  { path: P.deviceSetting.angle, access: 'always', nativeTheme: true, appHeader: true },
  { path: P.deviceSetting.credentials, access: 'always', nativeTheme: true, appHeader: true },
  { path: P.deviceSetting.botScript, access: 'always', nativeTheme: true, appHeader: true },
  { path: P.deviceSetting.autoUnlock, access: 'always', nativeTheme: true, appHeader: true },
  { path: P.deviceSetting.legacyIndex, access: 'always', nativeTheme: true, legacy: true },
  { path: P.deviceSetting.user, access: 'always', nativeTheme: true },
  { path: P.deviceSetting.rename, access: 'always', nativeTheme: true, appHeader: true },
  { path: P.deviceSetting.share, access: 'always', nativeTheme: true },
  { path: P.deviceSetting.batteryTrend, access: 'always', nativeTheme: true },
  { path: P.deviceSetting.factoryInfo, access: 'always', nativeTheme: true },
  { path: P.hub.legacyRoot, access: 'always', nativeTheme: true, appHeader: true, pullRefresh: true, legacy: true },
  { path: P.hub.index, access: 'always', nativeTheme: true, appHeader: true, pullRefresh: true, pcCard: true },
  { path: P.hub.ssmUpgrade, access: 'always' },
  { path: P.ir.type, access: 'always', appHeader: true },
  { path: P.ir.remotes, access: 'always', appHeader: true },
  { path: P.ir.air, access: 'always', appHeader: true },
  { path: P.ir.nonAir, access: 'always', appHeader: true },
  { path: P.ir.match, access: 'always', appHeader: true },
  { path: P.ir.learn, access: 'always', appHeader: true },
];

// Old paths that must keep resolving after a route moves; the target receives the original query string.
export const REDIRECTS = [
  { from: '/biz/access-control/ir-type', to: P.ir.type },
  { from: '/biz/access-control/remotes', to: P.ir.remotes },
  { from: '/biz/access-control/remote-air', to: P.ir.air },
  { from: '/biz/access-control/remote-non-air', to: P.ir.nonAir },
  { from: '/biz/access-control/remote-match', to: P.ir.match },
  { from: '/biz/access-control/learn', to: P.ir.learn },
];

// Sidebar entries, keyed by permission; Navigator orders them by customerInfo.access.
export const MENU = [
  { access: 'appDevices', router: P.root, isRoot: true, icon: 'sesame' },
  { access: 'appContacts', router: P.contacts, isRoot: true, icon: 'contacts' },
  { access: 'appMe', router: P.me, isRoot: true, icon: 'me' },
  { access: 'vision', router: P.vision, isRoot: true, icon: 'vision' },
  {
    access: 'members',
    router: '/biz/employees',
    icon: 'members',
    items: [
      { access: 'members', router: P.members.list },
      { access: 'membersGroup', router: P.members.group },
      { access: 'membersRole', router: P.members.role },
    ],
  },
  {
    access: 'ssmDevices',
    router: '/biz/devices',
    icon: 'ssmDevices',
    items: [
      { access: 'ssmDevices', router: P.doors.list },
      { access: 'ssmDevicesGroup', router: P.doors.group },
    ],
  },
  { access: 'touchDevices', router: P.accessControl.index, isRoot: true, icon: 'touchDevices' },
  { access: 'cards', router: P.cards.index, isRoot: true, icon: 'cards' },
  { access: 'historys', router: P.history.index, isRoot: true, icon: 'history' },
  { access: 'scheduleList', router: P.scheduleList, isRoot: true, icon: 'schedule' },
  { access: 'developer', router: P.developer, isRoot: true, icon: 'developer' },
];

// Paths that already live outside Biz (sent pushes, installed shells, the old native APP); they must always resolve.
export const PERMANENT_PATHS = [
  '/?appHome=1&fromType=app',
  '/?appHome=1&fromType=app&background=1',
  '/device-setting/battery-trend?deviceUUID=x&keyLevel=0&deviceModel=sesame_5&deviceName=x&setting=true',
  '/vision?deviceUUID=x&live=1',
  '/login?email=x&code=1',
  '/login?redirect=%2F',
  '/device-history',
  '/contacts',
  '/contact-add',
  '/biz/employees/list-item',
  '/device-notify',
  '/me',
  '/me/index',
  '/me/homepage',
  '/device-setting/index',
  '/biz/access-control/ir-type',
  '/biz/access-control/remote-air',
  '/biz/access-control/remote-non-air',
  '/biz/access-control/learn',
  '/biz/wifi-module',
  '/device-setting/factory-info',
];

export const routeOf = (path) => ROUTES.find((route) => route.path === path);
