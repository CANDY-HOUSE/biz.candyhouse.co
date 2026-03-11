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
};
