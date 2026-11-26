// Values are row keys of the card / passcode detail data; wordLabel gives their display text.
export const wordConfig = {
  touchDeviceName: 'ユーザー名',
  touchCertEquipment: '認証機器',
  touchIndex: 'インデックス',
  touchPinNumber: '暗証番号',
};

const labelKeys = {
  [wordConfig.touchDeviceName]: 'csv.header.userName',
  [wordConfig.touchCertEquipment]: 'csv.header.authDevices',
  [wordConfig.touchPinNumber]: 'csv.header.passcode',
};

export const wordLabel = (t, key) => (labelKeys[key] ? t(labelKeys[key]) : key);
