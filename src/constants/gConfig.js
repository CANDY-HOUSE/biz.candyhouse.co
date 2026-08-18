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
};
