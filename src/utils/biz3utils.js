import { Decoder, Encoder, ErrorCorrectionLevel } from '@nuintun/qrcode';
import { gConfig } from '@constants/gConfig';
import { Buffer } from 'buffer';
import { qrMode } from '@constants/qrType';
import { sesameTouchProAuthType } from '@constants/sesameTouchProAuthType';
import { modelNameByProductType } from '@/constants/sesameDeviceModel';

function timestampToTime(timestamp, ymd = true) {
  if (!timestamp) {
    return '';
  }
  try {
    let timestampStr = timestamp.toString();
    let date;
    if (timestampStr.length === 10) {
      date = new Date(parseInt(timestamp) * 1000);
    } else {
      date = new Date(parseInt(timestamp));
    }
    // 将时间戳转换为Date对象
    let year = date.getFullYear();
    // JavaScript的getMonth方法返回0-11，所以需要+1
    let month = ('0' + (date.getMonth() + 1)).slice(-2);
    let day = ('0' + date.getDate()).slice(-2);
    // 获取小时数，如果小于12则为'午前'，否则为'午後'
    let hours = date.getHours();
    let meridiem = hours < 12 ? 'AM' : 'PM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0小时转换为12
    let minutes = ('0' + date.getMinutes()).slice(-2);
    let seconds = ('0' + date.getSeconds()).slice(-2);
    if (ymd) {
      return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds} ${meridiem}`;
    } else {
      return `${meridiem} ${hours}:${minutes}:${seconds}`;
    }
  } catch (e) {
    console.log(e);
  }
  return '';
}

const hasListObj = (listA, listB, pc) => {
  return listA.some((itemA) => listB.some((itemB) => itemB[pc] === itemA[pc]));
};
const hasObj = (listA, listB, pc) => {
  return listA.some((itemA) => itemA[pc] === listB[pc]);
};

// 与手机APP保持一致
const modelName = modelNameByProductType;

const getProductTypeFromModelName = (model_name) => {
  const entry = Object.entries(modelName).find(([_, name]) => name === model_name);
  return entry ? parseInt(entry[0], 10) : null;
};

const getMatterProductTypeFromModelName = (model_name) => {
  const productType = getProductTypeFromModelName(model_name);
  if (productType === null) {
    return null;
  }
  // Map to Matter product types
  const matterProductTypeMap = {
    1: 255,
    2: 255,
    3: 255,
    4: 255,
    5: 0,
    6: 0,
    7: 0,
    8: 255,
    9: 255,
    10: 255,
    11: 255,
    13: 255,
    14: 255,
    15: 255,
    16: 0,
    17: 1,
    18: 255,
    19: 255,
    21: 255,
    22: 255,
    23: 255,
    24: 255,
  };
  return matterProductTypeMap[productType];
};

const isSesameOs3 = (productType) => {
  return productType - 5 >= 0;
};

const generateUserQRCodeBySubUUID = (userSub) => {
  if (!userSub) {
    return '';
  }
  return `ssm://UI/?t=${qrMode.QR_FRIEND}&${qrMode.QR_FRIEND}=${userSub.toUpperCase()}`;
};

const generateInviteGuestQRCodeByInfo = (deviceKey, guestInfo) => {
  if (!deviceKey) {
    console.error('Device key not found');
    return null;
  }
  const model = Object.entries(modelName).find(([_, name]) => name === deviceKey.deviceModel)?.[0];
  const deviceModel = parseInt(model, 10).toString(16).padStart(2, '0');
  const secretKey = guestInfo.guestKeyId || deviceKey.secretKey;
  const keydata =
    deviceModel + secretKey + deviceKey.sesame2PublicKey + deviceKey.keyIndex + deviceKey.deviceUUID.replace(/-/g, '');
  const littleKey = Buffer.from(keydata, 'hex').toString('base64');
  const sharedKey = 'sk';
  const baseURL = 'ssm://UI';
  const name = guestInfo.employeeName || deviceKey.deviceName;
  const params = [
    `t=${sharedKey}`,
    `${sharedKey}=${littleKey}`,
    `l=${guestInfo.keyLevel}`,
    `n=${encodeURIComponent(name)}`,
  ].join('&');
  return `${baseURL}?${params}`;
};
const writeQrcode = (text, call) => {
  if (!text) return call(null);
  const qrcode = new Encoder();
  qrcode.setErrorCorrectionLevel(ErrorCorrectionLevel.M);
  qrcode.write(text).make();
  call(qrcode);
};

const readUserQrcode = (imgUrl, call) => {
  if (!imgUrl) return;
  new Decoder()
    .scan(URL.createObjectURL(imgUrl))
    .then((result) => {
      const url = new URL(result.data);
      const urlParams = new URLSearchParams(url.search);
      const type = urlParams.get('t');
      const friendUUID = urlParams.get(qrMode.QR_FRIEND);
      if (type !== qrMode.QR_FRIEND || !friendUUID) {
        call(null);
        return;
      }
      call(null, {
        friendID: friendUUID.toLowerCase(),
      });
    })
    .catch((error) => {
      console.error('数据data', error);
      call(null);
    });
};

const readQrcode = (imgUrl, call) => {
  if (!imgUrl) return;
  new Decoder()
    .scan(URL.createObjectURL(imgUrl))
    .then((result) => {
      const urlParams = new URLSearchParams(result.data);
      const sk = urlParams.get('sk').replace(/ /g, '+');
      const msk = Buffer.from(sk, 'base64');
      const data = Buffer.from(msk, 'hex');
      console.log('数据data', data);
      const productType = parseInt(data.slice(0, 1).toString('hex'), 16); //1
      console.log('数据dataOs3', productType);
      if (isSesameOs3(productType)) {
        const secretKey = data.slice(1, 1 + 16).toString('hex'); //1-17
        const sesame2PublicKey = data.slice(1 + 16, 1 + 16 + 4).toString('hex');
        const keyIndex = data.slice(1 + 16 + 4, 1 + 16 + 4 + 2).toString('hex');
        let deviceUUID = data.slice(1 + 16 + 4 + 2).toString('hex');
        deviceUUID = deviceUUID.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
        const qrKeyInfo = {
          secretKey: secretKey,
          keyIndex: keyIndex,
          sesame2PublicKey: sesame2PublicKey,
          keyLevel: parseInt(urlParams.get('l')),
          deviceModel: modelName[productType],
          deviceName: urlParams.get('n'),
          deviceUUID: deviceUUID.toUpperCase(),
        };
        console.log('数据dataOs3', qrKeyInfo);
        call(null, qrKeyInfo);
      } else {
        const secretKey = data.slice(1, 17).toString('hex'); //1-17
        const sesame2PublicKey = data.slice(17, 81).toString('hex');
        const keyIndex = data.slice(81, 83).toString('hex');
        let deviceUUID = data.slice(83, 99).toString('hex');
        deviceUUID = deviceUUID.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
        const qrKeyInfo = {
          secretKey: secretKey,
          keyIndex: keyIndex,
          sesame2PublicKey: sesame2PublicKey,
          keyLevel: parseInt(urlParams.get('l')),
          deviceModel: modelName[productType],
          deviceName: urlParams.get('n'),
          deviceUUID: deviceUUID.toUpperCase(),
        };
        console.log('数据data', qrKeyInfo);
        call(null, qrKeyInfo);
      }
    })
    .catch((error) => {
      console.error('数据data', error);
      call(error);
    });
};

function hexStringToUint8Array(hexString) {
  if (hexString === undefined || hexString === null) {
    // throw new Error('hexString is undefined or null');
    return [];
  }
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hexString');
  }
  const arrayBuffer = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    const byteValue = parseInt(hexString.substring(i, i + 2), 16);
    arrayBuffer[i / 2] = byteValue;
  }
  return arrayBuffer;
}
function insertUUIDIsolationCharacter(uuid) {
  return uuid.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
}

function stringToUint8Array(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// 把 cardID 都统一成小写带分隔符的 uuid 形式, 补齐32位， 与手机APP保持一致
function formatCardID(cardID) {
  if (typeof cardID !== 'string' || cardID.trim() === '') {
    return ''; // 如果 cardID 不是字符串类型，或者是一个仅包含空格的字符串，则返回空字符串
  }
  let ID = cardID.toLowerCase();
  if (ID.length < 32) {
    let len = 32 - ID.length;
    for (let i = 0; i < len; i++) {
      ID += 'f';
    }
  }
  ID = biz3utils.insertUUIDIsolationCharacter(ID);
  return ID;
}

// 123 变为固件识别的  010203
const formatPasscodeID = (password) => {
  return Array.from(password.toString())
    .map((num) => ('0' + parseInt(num, 10).toString(16)).slice(-2))
    .join('')
    .toUpperCase();
};

const generateUUID = () => {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID().toUpperCase();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
    .toUpperCase();
};

const generateNoDashUUID = () => {
  return generateUUID().replace(/-/g, '');
};

const buildPayloadCardAdd = ({ cardID }) => {
  if (!cardID) {
    return '';
  }
  let card_id_len = cardID.length / 2;
  const nameUUID = generateNoDashUUID();
  const nameUUIDLen = nameUUID.length / 2;
  let payload = new Uint8Array(41);
  payload[0] = gConfig.cmdCode.SSM_OS3_CARD_ADD;
  payload[1] = 0xf0; // 卡片头数据： EMPTY 0xFF， USED 0xF0， DELETED 0x00
  payload[2] = 0x80; // 卡片类型 0x80 表示从 IoT 添加的卡片
  payload[3] = card_id_len; // 卡片ID长度
  const cardIDArray = biz3utils.hexStringToUint8Array(cardID);
  // 如果card_id_len不足16，则将剩余部分补0
  const paddedCardIDArray = new Uint8Array(16);
  paddedCardIDArray.set(cardIDArray);
  payload.set(paddedCardIDArray, 4);
  payload[4 + 16] = nameUUIDLen; // 卡片名字长度
  payload.set(biz3utils.hexStringToUint8Array(nameUUID), 4 + 16 + 1); // 卡片nameUUID
  return payload;
};

const buildPayloadPasscodeAdd = ({ password: passcodeID }) => {
  if (!passcodeID) {
    return '';
  }
  let card_id_len = passcodeID.length / 2;
  const nameUUID = generateNoDashUUID();
  const nameUUIDLen = nameUUID.length / 2;
  let payload = new Uint8Array(41);
  payload[0] = gConfig.cmdCode.SSM_OS3_PASSCODE_ADD;
  payload[1] = 0xf0; // 卡片头数据： EMPTY 0xFF， USED 0xF0， DELETED 0x00
  payload[2] = 0x00; // 卡片类型 0x80 表示从 IoT 添加的卡片
  payload[3] = card_id_len; // 卡片ID长度
  const cardIDArray = biz3utils.hexStringToUint8Array(passcodeID);
  // 如果card_id_len不足16，则将剩余部分补0
  const paddedCardIDArray = new Uint8Array(16);
  paddedCardIDArray.set(cardIDArray);
  payload.set(paddedCardIDArray, 4);
  payload[4 + 16] = nameUUIDLen; // 卡片名字长度
  payload.set(biz3utils.hexStringToUint8Array(nameUUID), 4 + 16 + 1); // 卡片nameUUID
  return payload;
};

const buildPayloadModeSet = ({ uuid, type, insertOn }) => {
  const config = {
    [sesameTouchProAuthType.card]: {
      cmdCode: gConfig.cmdCode.SSM_OS3_CARD_MODE_SET,
    },
    [sesameTouchProAuthType.password]: {
      cmdCode: gConfig.cmdCode.SSM_OS3_PASSCODE_MODE_SET,
    },
  };
  const currentConfig = config[type];
  if (!currentConfig) {
    return null;
  }
  let payload = new Uint8Array(2);
  payload[0] = currentConfig.cmdCode;
  payload[1] = insertOn ? gConfig.cardMode.CARD_ENROLL : gConfig.cardMode.CARD_VERIFY;
  let base64 = Buffer.from(payload).toString('base64');
  return {
    topic: `stp${uuid}cmd`,
    payload: base64,
    op: currentConfig.cmdCode,
  };
};

const parseHexStrToCardInfo = (cardHex) => {
  try {
    const dataArray = biz3utils.hexStringToUint8Array(cardHex);
    let i = 1;
    const item = {};
    item.cardType = dataArray[i]; // 类型
    i += 1;
    item.id_len = dataArray[i]; // ID长度
    i += 1;
    item.cardID = Buffer.from(dataArray.slice(i, i + item.id_len))
      .toString('hex')
      .toUpperCase();
    i += item.id_len;
    item.nameUUIDLen = dataArray[i];
    i += 1;
    const nameBuff = dataArray.slice(i, i + item.nameUUIDLen);
    if (nameBuff) {
      item.nameUUID = insertUUIDIsolationCharacter(Buffer.from(nameBuff).toString('hex'));
    } else {
      item.nameUUID = '';
    }
    return item;
  } catch (error) {
    console.log('err', error);
  }
  return null;
};

const parseHexStrToPasscodeInfo = (cardHex) => {
  //"F0 00 07 01 06 00 02 00 00 03 FF FF FF FF FF FF FF FF FF 10 368154C128BC4BCDBE62F3B15C7496D000000000"
  //  0  1  2  3  4  5  6  7  8  9                         18 19
  try {
    const dataArray = biz3utils.hexStringToUint8Array(cardHex);
    let i = 2;
    const item = {};
    item.id_len = dataArray[i];
    i++;
    item.passwordID = Buffer.from(dataArray.slice(i, i + item.id_len))
      .toString('hex')
      .toUpperCase();
    i += item.id_len;
    i += 16 - item.id_len;
    item.nameUUIDLen = dataArray[i];
    i++;
    const nameBuff = dataArray.slice(i, i + item.nameUUIDLen);
    if (nameBuff) {
      item.nameUUID = insertUUIDIsolationCharacter(Buffer.from(nameBuff).toString('hex'));
    } else {
      item.nameUUID = '';
    }
    return item;
  } catch (error) {
    console.log('parseHexStrToPasscodeInfo error:', error);
    return null;
  }
};

function convertHexPairsToDecimal(hexString) {
  let result = '';
  if (hexString.length % 2 !== 0) {
    hexString = '0' + hexString;
  }
  for (let i = 0; i < hexString.length; i += 2) {
    const hexPair = hexString.substring(i, i + 2);
    const decimalValue = parseInt(hexPair, 16);
    result += decimalValue;
  }
  return result;
}

const isUUIDV4 = (tag) => {
  if (!tag) {
    return false;
  }
  let tagBuffer = tag;
  if (typeof tagBuffer === 'string') {
    tagBuffer = Buffer.from(tag.replace(/-/g, ''), 'hex');
  }
  if (tagBuffer.length !== 16) {
    return false;
  }
  const version = tagBuffer[6] & 0xf0;
  const variant = tagBuffer[8] & 0xc0;
  if (version === 0x40 && variant === 0x80) {
    return true;
  } else {
    return false;
  }
};

const uuidBuffer = (uuid, prefix = '000c') => {
  const cleanUuid = prefix + uuid.replace(/-/g, '');
  const uuidBuffer = Buffer.from(cleanUuid, 'hex');
  return uuidBuffer.toString('base64');
};

const triggerScheme = (scheme) => {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = scheme;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 100);
  } catch (e) {
    console.log('Scheme trigger failed:', e);
  }
};

const triggerBridge = (message) => {
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iOSHandler) {
    window.webkit.messageHandlers.iOSHandler.postMessage(message);
    return true;
  } else if (window.AndroidHandler) {
    window.AndroidHandler.postMessage(JSON.stringify(message));
    return true;
  } else {
    console.error('不在 App 环境中');
    return false;
  }
};

const extractCardIDsFromBase64 = (base64Payload) => {
  const buffer = Buffer.from(base64Payload, 'base64');
  // 第一个字节是操作码，跳过
  let offset = 1;
  const cardIDs = [];
  // 解析所有卡片 ID
  while (offset < buffer.length) {
    // 读取卡片 ID 长度
    const cardIdLen = buffer[offset];
    offset += 1;
    // 边界检查
    if (offset + cardIdLen > buffer.length) {
      console.error(`Buffer overflow detected when reading card ID at offset ${offset}`);
      break;
    }
    // 提取卡片 ID 的 bytes
    const cardIDBytes = buffer.slice(offset, offset + cardIdLen);
    offset += cardIdLen;
    // 将 bytes 转换为 16 进制字符串
    const hexString = cardIDBytes.toString('hex');
    // 按照 UUID 格式添加破折号 (如果长度符合 UUID)
    let formattedUUID = hexString;
    if (hexString.length === 32) {
      formattedUUID = `${hexString.substring(0, 8)}${hexString.substring(8, 12)}${hexString.substring(12, 16)}${hexString.substring(16, 20)}${hexString.substring(20)}`;
    }
    cardIDs.push({
      cardID: formattedUUID,
    });
  }
  return cardIDs.map((item) => item.cardID);
};

export const biz3utils = {
  timestampToTime,
  readUserQrcode,
  readQrcode,
  writeQrcode,
  hasListObj,
  hasObj,
  hexStringToUint8Array,
  stringToUint8Array,
  insertUUIDIsolationCharacter,
  formatCardID,
  formatPasscodeID,
  uuidBuffer,
  isUUIDV4,
  buildPayloadModeSet,
  buildPayloadCardAdd,
  parseHexStrToCardInfo,
  parseHexStrToPasscodeInfo,
  buildPayloadPasscodeAdd,
  convertHexPairsToDecimal,
  generateUserQRCodeBySubUUID,
  generateInviteGuestQRCodeByInfo,
  triggerScheme,
  triggerBridge,
  generateUUID,
  generateNoDashUUID,
  getProductTypeFromModelName,
  getMatterProductTypeFromModelName,
  extractCardIDsFromBase64,
};
