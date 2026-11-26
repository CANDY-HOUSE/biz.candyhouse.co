import { gConfig } from '@constants/gConfig';
import { pageNames } from '@/routes/manifest';
import { modelNameByProductType } from '@constants/sesameDeviceModel';
import { biz3utils } from './biz3utils';
import { csvUtils } from './csvutils';
import i18n from '@/i18n';

const uuidsToNames = (uuids, alltouchs) => {
  if (!uuids || uuids.length === 0) {
    return [];
  }
  const uuidToNameMap = alltouchs.reduce((map, device) => {
    map[device.deviceUUID.toUpperCase()] = device.deviceName;
    return map;
  }, {});
  return uuids.reduce((names, uuid) => {
    const name = uuidToNameMap[uuid.toUpperCase()];
    if (name) {
      names.push(name);
    }
    return names;
  }, []);
};

const includesIgnoreCase = (str, key) => {
  return typeof str === 'string' && str.toUpperCase().includes(key);
};

const findSearchList = (key, list, tagList) => {
  console.log('搜索设备', key, list, tagList);
  const upperKey = key.toUpperCase(); // Convert key to uppercase once
  return list.filter((item) => {
    if (includesIgnoreCase(item.name, upperKey)) return true;
    if (includesIgnoreCase(item.cardID, upperKey)) return true;
    if (includesIgnoreCase(item.fingerID, upperKey)) return true;
    if (includesIgnoreCase(item.passwordID, upperKey)) return true;
    if (
      item.uuids &&
      (item.uuids.some((i) => includesIgnoreCase(i, upperKey)) ||
        uuidsToNames(item.uuids, tagList).some((i) => includesIgnoreCase(i, upperKey)))
    )
      return true;
    if (includesIgnoreCase(item.deviceName, upperKey)) return true;
    if (includesIgnoreCase(item.deviceModel, upperKey)) return true;

    if (Array.isArray(item.groupName) && item.groupName.some((i) => includesIgnoreCase(i, upperKey))) return true;

    return false;
  });
};

function toCardInfo(id, t, n) {
  console.log('toCardInfo', id, t, n);
  if (!id) {
    return;
  }
  if (!t) {
    t = 0;
  }
  if (typeof id !== 'string') {
    id = String(id); // 确保 id 是字符串
  }
  if (typeof n !== 'string') {
    n = String(n); // 确保 n 是字符串
  }

  let hexString = '';
  hexString += 'F0';
  hexString += t.toString(16).padStart(2, '0').toUpperCase();
  let idLength = id.length / 2; // ID 的长度是十六进制字符数的一半
  hexString += idLength.toString(16).padStart(2, '0').toUpperCase();
  hexString += id.toUpperCase();
  let encoder = new TextEncoder();
  let nameBuffer = encoder.encode(n);
  let nameHex = Array.from(nameBuffer, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  let nameLength = nameHex.length / 2;
  hexString = hexString.padEnd(38, 'F');
  hexString += nameLength.toString(16).padStart(2, '0').toUpperCase();
  hexString += nameHex;
  hexString = hexString.padEnd(80, '0');
  return hexString;
}

function uniqueByProperty(list, key) {
  const seen = new Set();

  return list.filter((item) => {
    const keyValue = item[key];
    if (seen.has(keyValue)) {
      return false;
    }
    seen.add(keyValue);
    return true;
  });
}
function binaryToDecimal(hexString) {
  try {
    return hexString
      .split('')
      .map((char, index) => (index % 2 !== 0 ? char : ''))
      .join('');
  } catch (e) {
    console.log('error', e);
  }

  return hexString;
}

function timeToDate(time) {
  //  console.log("timeToDate",time)
  const date = new Date(time * 1000);

  const year = date.getFullYear();

  const month = date.getMonth() + 1;
  const day = date.getDate();
  console.log(`${year}年${month}月${day}日`);
  return i18n.t('manage.date.ymd', { year, month, day });
}

function formatTimestampToMonthDayLocal(time) {
  const timeStr = String(time);
  if (!/^\d{10}$/.test(timeStr)) {
    return null;
  }
  const date = new Date(parseInt(timeStr, 10) * 1000);
  const month = (date.getMonth() + 1).toString();
  const day = date.getDate().toString();
  const hours = date.getHours().toString();
  const minutes = date.getMinutes().toString();
  return `${month}/${day} ${hours}:${minutes}`;
}

const isContainPage = (access, id, isSesameApp = false) => {
  if (!access) {
    return false;
  }
  if (access.some((it) => it === id)) {
    return true;
  }
  if (access.some((it) => it === pageNames.devices)) {
    if (id === pageNames.touchDevices || id === pageNames.ssmDevices) {
      return true;
    }
  }
  // 为 app 默认开启 门锁/认证机器/个人信息 访问权限
  if (isSesameApp) {
    const subAccess = [pageNames.ssmDevices, pageNames.touchDevices, pageNames.members];
    return subAccess.includes(id);
  }
  return false;
};

const allTags = [pageNames.members, pageNames.devices, pageNames.cards, pageNames.historys, pageNames.developer];

const isWifiModel = (model) => {
  const targetDeviceModels = [
    gConfig.sesameDeviceModel.wm_2,
    gConfig.sesameDeviceModel.hub_3,
    gConfig.sesameDeviceModel.hub3_pro,
  ];
  return targetDeviceModels.indexOf(model) !== -1;
};

const isSesameAccessControlDevice = (model) => {
  const targetDeviceModels = [
    gConfig.sesameDeviceModel.ssm_touch,
    gConfig.sesameDeviceModel.ssm_touch_pro,
    gConfig.sesameDeviceModel.sesame_face,
    gConfig.sesameDeviceModel.sesame_face_pro,
    gConfig.sesameDeviceModel.sesame_face_ai,
    gConfig.sesameDeviceModel.sesame_face_pro_ai,
    gConfig.sesameDeviceModel.ssm_touch_2,
    gConfig.sesameDeviceModel.ssm_touch_2_pro,
    gConfig.sesameDeviceModel.sesame_face_2,
    gConfig.sesameDeviceModel.sesame_face_2_pro,
    gConfig.sesameDeviceModel.sesame_face_2_ai,
    gConfig.sesameDeviceModel.sesame_face_2_pro_ai,
  ];
  return targetDeviceModels.indexOf(model) !== -1;
};

const lockModelDevices = [
  gConfig.sesameDeviceModel.sesame_miwa,
  gConfig.sesameDeviceModel.sesame_2,
  gConfig.sesameDeviceModel.sesame_4,
  gConfig.sesameDeviceModel.sesame_5,
  gConfig.sesameDeviceModel.sesame_5_pro,
  gConfig.sesameDeviceModel.sesame_5_us,
  gConfig.sesameDeviceModel.bot_2,
  gConfig.sesameDeviceModel.bot_3,
  gConfig.sesameDeviceModel.ssmbot_1,
  gConfig.sesameDeviceModel.sesame_6,
  gConfig.sesameDeviceModel.sesame_6_pro,
  gConfig.sesameDeviceModel.sesame_6_pro_slidingdoor,
  gConfig.sesameDeviceModel.ble_connector,
  gConfig.sesameDeviceModel.ssm_bike2,
  gConfig.sesameDeviceModel.ssm_bike3,
];

const isLockModel = (model) => {
  return lockModelDevices.indexOf(model) !== -1;
};

const canNFCCardControl = (model) => {
  const targetDeviceModels = [
    gConfig.sesameDeviceModel.ssm_touch,
    gConfig.sesameDeviceModel.ssm_touch_pro,
    gConfig.sesameDeviceModel.sesame_face,
    gConfig.sesameDeviceModel.sesame_face_pro,
    gConfig.sesameDeviceModel.ssm_touch_2,
    gConfig.sesameDeviceModel.ssm_touch_2_pro,
    gConfig.sesameDeviceModel.sesame_face_2,
    gConfig.sesameDeviceModel.sesame_face_2_pro,
  ];
  return targetDeviceModels.indexOf(model) !== -1;
};

const canPasswordControl = (model) => {
  const targetDeviceModels = [
    gConfig.sesameDeviceModel.ssm_touch_pro,
    gConfig.sesameDeviceModel.sesame_face_pro,
    gConfig.sesameDeviceModel.sesame_face_pro_ai,
    gConfig.sesameDeviceModel.ssm_touch_2_pro,
    gConfig.sesameDeviceModel.sesame_face_2_pro,
    gConfig.sesameDeviceModel.sesame_face_2_pro_ai,
  ];
  return targetDeviceModels.indexOf(model) !== -1;
};

const canFingerprintControl = (model) => {
  return canNFCCardControl(model);
};

const canFaceControl = (model) => {
  const targetDeviceModels = [
    gConfig.sesameDeviceModel.sesame_face,
    gConfig.sesameDeviceModel.sesame_face_pro,
    gConfig.sesameDeviceModel.sesame_face_ai,
    gConfig.sesameDeviceModel.sesame_face_pro_ai,
    gConfig.sesameDeviceModel.sesame_face_2,
    gConfig.sesameDeviceModel.sesame_face_2_pro,
    gConfig.sesameDeviceModel.sesame_face_2_ai,
    gConfig.sesameDeviceModel.sesame_face_2_pro_ai,
  ];
  return targetDeviceModels.indexOf(model) !== -1;
};

const canPalmControl = (model) => {
  return canFaceControl(model);
};

const canWifiModuleControl = (model) => {
  const lockModelsWithOS3 = lockModelDevices.filter((deviceModel) => {
    const key = Object.keys(modelNameByProductType).find((k) => modelNameByProductType[k] === deviceModel);
    return key && parseInt(key) > 4;
  });
  return isSesameAccessControlDevice(model) || lockModelsWithOS3.indexOf(model) !== -1;
};

const isShowType = (model, type) => {
  switch (type) {
    case gConfig.sesameTouchProAuthType.card:
      return canNFCCardControl(model);
    case gConfig.sesameTouchProAuthType.finger:
      return canFingerprintControl(model);
    case gConfig.sesameTouchProAuthType.password:
      return canPasswordControl(model);
    case gConfig.sesameTouchProAuthType.face:
      return canFaceControl(model);
    case gConfig.sesameTouchProAuthType.palm:
      return canPalmControl(model);
    default:
      return false;
  }
};

const isBotModel = (model) => {
  const targetDeviceModels = [
    gConfig.sesameDeviceModel.ssmbot_1,
    gConfig.sesameDeviceModel.bot_2,
    gConfig.sesameDeviceModel.bot_3,
  ];
  return targetDeviceModels.indexOf(model) !== -1;
};

const isOPSModel = (model) => {
  const targetDeviceModels = [gConfig.sesameDeviceModel.ssm_opensensor_1, gConfig.sesameDeviceModel.ssm_opensensor_2];
  return targetDeviceModels.indexOf(model) !== -1;
};

const isHub3Pro = (model) => {
  const targetDeviceModels = [gConfig.sesameDeviceModel.hub3_pro];
  return targetDeviceModels.indexOf(model) !== -1;
};

const isDeviceKeyOwner = (sesameKeylevel) => {
  return sesameKeylevel === 0;
};

const isDeviceKeyGuest = (sesameKeylevel) => {
  return sesameKeylevel === 2;
};

const hasListObj = (listA, listB, pc) => {
  return listA.some((itemA) => listB.some((itemB) => itemB[pc] === itemA[pc]));
};
const hasObj = (listA, listB, pc) => {
  return listA.some((itemA) => itemA[pc] === listB[pc]);
};

const readQrcode = (imgUrl, call) => {
  return biz3utils.readQrcode(imgUrl, call);
};

function getStartTimeEndTime(item) {
  let st = item.startTime ? item.startTime : item.startAt;
  let et = item.startTime ? item.endTime : item.endAt;

  let startDate = new Date(st * 1000);
  let endDate = new Date(et * 1000);

  // Format the date and time in the desired format
  // Example format: "2023-03-01 12:00:00"
  let startFormatted =
    startDate.getFullYear() +
    '-' +
    ('0' + (startDate.getMonth() + 1)).slice(-2) +
    '-' +
    ('0' + startDate.getDate()).slice(-2) +
    ' ' +
    ('0' + startDate.getHours()).slice(-2) +
    ':' +
    ('0' + startDate.getMinutes()).slice(-2) +
    ':' +
    ('0' + startDate.getSeconds()).slice(-2);

  let endFormatted =
    endDate.getFullYear() +
    '-' +
    ('0' + (endDate.getMonth() + 1)).slice(-2) +
    '-' +
    ('0' + endDate.getDate()).slice(-2) +
    ' ' +
    ('0' + endDate.getHours()).slice(-2) +
    ':' +
    ('0' + endDate.getMinutes()).slice(-2) +
    ':' +
    ('0' + endDate.getSeconds()).slice(-2);

  return startFormatted + ' - ' + endFormatted;
}

function isValidEmail(strEmail) {
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{1,}))$/;
  return emailRegex.test(strEmail);
}

let localizedAuthText = {};
const authTextFor = (language) => {
  if (localizedAuthText.language !== language) {
    localizedAuthText = {
      language,
      fontCfpCards: {
        title: i18n.t('manage.authText.cards.title'),
        h2: i18n.t('manage.authText.cards.h2'),
        b2t: i18n.t('manage.authText.cards.b2t'),
        warningMsg: i18n.t('manage.authText.cards.warningMsg'),
      },
      fontCfpPw: {
        title: i18n.t('manage.authText.passcode.title'),
        h2: i18n.t('manage.authText.passcode.h2'),
        b2t: i18n.t('manage.authText.passcode.b2t'),
      },
    };
  }
  return localizedAuthText;
};
const authText = {
  get fontCfpCards() {
    return authTextFor(i18n.language).fontCfpCards;
  },
  get fontCfpPw() {
    return authTextFor(i18n.language).fontCfpPw;
  },
};

const isSupportRechargeableBattery = (model) => {
  const productTypeId = Object.keys(modelNameByProductType).find((key) => modelNameByProductType[key] === model);
  return parseInt(productTypeId ?? 21) - 21 >= 0;
};

export const gUtils = {
  csvUtils,
  uuidsToNames,
  findSearchList,
  toCardInfo,
  binaryToDecimal,
  timeToDate,
  uniqueByProperty,
  allTags,
  pageNames,
  isWifiModel,
  isDeviceKeyOwner,
  isDeviceKeyGuest,
  isSesameAccessControlDevice,
  isLockModel,
  canPasswordControl,
  readQrcode,
  hasListObj,
  hasObj,
  isBotModel,
  isOPSModel,
  isHub3Pro,
  getStartTimeEndTime,
  isValidEmail,
  isShowType,
  isContainPage,
  canWifiModuleControl,
  formatTimestampToMonthDayLocal,
  isSupportRechargeableBattery,
  authText,
};
