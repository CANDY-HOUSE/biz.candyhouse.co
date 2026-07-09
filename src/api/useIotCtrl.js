import { useCallback } from 'react';
import { Cmac } from '@/utils/Cmac';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import { ACTION_TYPES } from '@constants/messageConstants.js';
import { biz3utils } from '@/utils/biz3utils.js';
// import WebSocketManager from '../websocket/WebSocketManager.ts';
import { Buffer } from 'buffer';
import { gConfig } from '@constants/gConfig.js';
import useOperateIoT from '@/hooks/useOperateIoT';
import { getEnvId } from '@/utils/envIdentity.js';

const PubedDeviceStateChange = 'pubDeviceStateChange';
const PubedUserDeviceChange = 'pubUserDeviceChange';

export const useIotCtrl = (gAuth, gStripe, gManageDevice) => {
  const { sendCmd } = useOperateIoT();

  const handleTriggerResponse = useCallback(
    (message) => {
      switch (message.action) {
        case ACTION_TYPES.BIZ3_TRIGGER_LOCKER:
          if (message.op === PubedDeviceStateChange) {
            gManageDevice.updateDeviceState(message.data);
          } else if (message.op === PubedUserDeviceChange) {
            gManageDevice.getCompanyDevices();
          }
          break;
        default:
          break;
      }
    },
    [gAuth]
  );

  useWebSocket(ACTION_TYPES.BIZ3_TRIGGER_LOCKER, handleTriggerResponse);

  const sendCommandToWM2 = useCallback(
    async ({ device_id, cmd = 88, sescretKey }) => {
      const sign = await Cmac.cmacTime(sescretKey);
      const uuid = getEnvId() || gStripe.customerInfo.subUUID;
      const history = biz3utils.uuidBuffer(uuid);
      const msgData = {
        action: ACTION_TYPES.BIZ3_TRIGGER_LOCKER,
        cmd,
        sign,
        history,
        device_id,
      };
      sendMessage(msgData);
    },
    [gStripe.customerInfo.subUUID]
  );

  const handleSesameItemOperation = useCallback((iotPayload, payloadArray) => {
    const sesameId = iotPayload.sesameId;
    const cleanSesameId = sesameId?.replace(/-/g, '') ?? '';
    const sesameIdArray = biz3utils.hexStringToUint8Array(cleanSesameId);

    const sesameSecretKey = iotPayload.ssmSecKa;
    const secretKeyArray = biz3utils.hexStringToUint8Array(sesameSecretKey);

    const nickName = iotPayload.nickName || '';
    const nickNameArray = biz3utils.stringToUint8Array(nickName);
    const NICKNAME_LENGTH_BYTE_SIZE = 1;
    const PRODUCT_TYPE_BYTE_SIZE = 1;
    const MATTER_PRODUCT_TYPE_BYTE_SIZE = 1;

    if (nickNameArray.length > 255) {
      throw new Error('Nickname too long to fit in one-byte length field');
    }
    const nickNameArrayLength = nickNameArray.length;

    const productTypeValue = biz3utils.getProductTypeFromModelName(iotPayload.deviceModel);
    const productTypeArray = new Uint8Array([productTypeValue]);

    const matterProductTypeValue = biz3utils.getMatterProductTypeFromModelName(iotPayload.deviceModel);
    const matterProductTypeArray = new Uint8Array([matterProductTypeValue]);

    // 构造 payload 数组
    const iotPayloadArrayLength =
      sesameIdArray.length +
      secretKeyArray.length +
      NICKNAME_LENGTH_BYTE_SIZE +
      nickNameArray.length +
      PRODUCT_TYPE_BYTE_SIZE +
      MATTER_PRODUCT_TYPE_BYTE_SIZE;

    const iotPayloadArray = new Uint8Array(iotPayloadArrayLength);
    let offset = 0;
    iotPayloadArray.set(sesameIdArray, offset);
    offset += sesameIdArray.length;
    iotPayloadArray.set(secretKeyArray, offset);
    offset += secretKeyArray.length;
    iotPayloadArray[offset] = nickNameArrayLength;
    offset += NICKNAME_LENGTH_BYTE_SIZE;
    iotPayloadArray.set(nickNameArray, offset);
    offset += nickNameArrayLength;
    iotPayloadArray.set(productTypeArray, offset);
    offset += PRODUCT_TYPE_BYTE_SIZE;
    iotPayloadArray.set(matterProductTypeArray, offset);

    // 合并到 payloadArray 并返回结果
    const newPayloadArray = new Uint8Array(payloadArray.length + iotPayloadArray.length);
    newPayloadArray.set(payloadArray, 0);
    newPayloadArray.set(iotPayloadArray, payloadArray.length);

    return newPayloadArray;
  }, []);

  // DFU 用这个， 需要传 connectionId， 方便 Hub3 回报 DFU 结果
  const sendCommandToHub3WithConnectionId = useCallback(
    async ({ device_id, hub3_id, cmd = gConfig.cmdCode.ssmOSUpdate, secretKey, iotPayload = {} }) => {
      if (!hub3_id) {
        hub3_id = device_id;
      }
      const lastSegment = hub3_id.split('-').pop();
      const topic = `wm2${lastSegment}cmd`;
      console.log('==> topic', topic);

      console.log('==> secretKey', secretKey);
      const sign = await Cmac.cmacTime(secretKey);
      const signArray = biz3utils.hexStringToUint8Array(sign);

      const cmdArray = new Uint8Array(1);
      cmdArray[0] = cmd;

      // device_id 转为 Uint8Array
      const didArray = biz3utils.stringToUint8Array(device_id);

      /* 使用 BIZ3_OPERATE_IOT 时， connectionId 在云端自动添加 , 
         本来想借用 sendCommandToWM2， 把 connectionId 添加到 history 中 ， 
          WebSocketManager.getConnectionId() 方法已实现， 暂时保留此方法
         */
      // 取得 connectionId 并转为 Uint8Array
      // const cid = WebSocketManager.getConnectionId(); // base64 字符串
      // console.log('==> cid', cid);
      // const cidArray = Buffer.from(cid, 'base64');
      // console.log('==> cidArray', cidArray);

      // 拼接 signArray + cmdArray + didArray + cidArray
      // const totalLength = signArray.length + cmdArray.length + didArray.length + cidArray.length;

      const totalLength = signArray.length + cmdArray.length + didArray.length;
      let payloadArray = new Uint8Array(totalLength);
      let offset = 0;
      payloadArray.set(signArray, offset);
      offset += signArray.length;
      payloadArray.set(cmdArray, offset);
      offset += cmdArray.length;
      payloadArray.set(didArray, offset);
      offset += didArray.length;
      // payloadArray.set(cidArray, offset);

      if (Object.keys(iotPayload).length > 0) {
        switch (cmd) {
          case gConfig.cmdCode.SSM3_ITEM_REMOVE_SESAME:
            /* SSM3_ITEM_REMOVE_SESAME 与 SSM3_ITEM_ADD_SESAME 的逻辑一样 */
            payloadArray = handleSesameItemOperation(iotPayload, payloadArray);
            break;
          case gConfig.cmdCode.SSM3_ITEM_ADD_SESAME:
            payloadArray = handleSesameItemOperation(iotPayload, payloadArray);
            break;

          case gConfig.cmdCode.HUB3_ITEM_CODE_LED_DUTY:
            {
              const op = iotPayload.op;
              const duty = iotPayload.duty;

              // 参数有效性检查
              if (op === undefined || duty === undefined) {
                console.error('Missing required parameters: op or duty');
                return;
              }

              // 边界检查确保值在Uint8范围内
              if (op < 0 || op > 255 || duty < 0 || duty > 255) {
                console.error('Parameters out of range for Uint8Array: op=', op, ', duty=', duty);
                return;
              }

              const iotPayloadArray = new Uint8Array(2);
              iotPayloadArray[0] = op;
              iotPayloadArray[1] = duty;

              // 合并到 payloadArray
              const newPayloadArray = new Uint8Array(payloadArray.length + iotPayloadArray.length);
              newPayloadArray.set(payloadArray, 0);
              newPayloadArray.set(iotPayloadArray, payloadArray.length);
              payloadArray = newPayloadArray;
            }
            break;

          case gConfig.cmdCode.HUB3_ITEM_CODE_RELAY_SWITCH:
            {
              // Hub3 LTE 继电器开关命令
              // op 固定为 0x01，代表开关操作
              const op = iotPayload.op !== undefined ? iotPayload.op : 0x01;

              // 边界检查确保值在Uint8范围内
              if (op < 0 || op > 255) {
                console.error('Parameter out of range for Uint8Array: op=', op);
                return;
              }

              const iotPayloadArray = new Uint8Array(1);
              iotPayloadArray[0] = op;

              // 合并到 payloadArray
              const newPayloadArray = new Uint8Array(payloadArray.length + iotPayloadArray.length);
              newPayloadArray.set(payloadArray, 0);
              newPayloadArray.set(iotPayloadArray, payloadArray.length);
              payloadArray = newPayloadArray;
            }
            break;
          case gConfig.cmdCode.HUB3_ITEM_CODE_CLEAR_WIFI_SSID:
            break;

          default:
            console.warn('Unsupported cmd for iotPayload:', cmd);
            break;
        }
      }
      const payload = Buffer.from(payloadArray).toString('base64');
      sendCmd({
        topic,
        payload,
        op: 'cmd',
      });
    },
    [sendCmd, handleSesameItemOperation]
  );

  return {
    sendCommandToWM2,
    sendCommandToHub3WithConnectionId,
  };
};
