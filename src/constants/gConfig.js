import { cardMode } from './cardMode';
import { cmdCode } from './cmdCode';
import { sesameDeviceModel } from './sesameDeviceModel';
import { sesameTouchProAuthType } from './sesameTouchProAuthType';
import { loginState } from './loginState';

export const gConfig = {
  sesameDeviceModel,
  sesameTouchProAuthType,
  loginState,
  cmdCode,
  cardMode,
  hub3LedDutyOp: {
    set: 0x01,
    get: 0x02,
  },
  // Hub3 LTE 继电器分路控制：relayId 指定哪一路，action 指定开/关
  hub3RelayId: {
    relay1: 1,
    relay2: 2,
  },
  hub3RelayAction: {
    off: 0,
    on: 1,
  },
  // Hub3 Pro 接入方式（与固件 net_type_t 一致）
  hub3AccessMode: {
    auto: 0,
    ethernet: 1,
    wifi: 2,
    lte: 3,
  },
};
