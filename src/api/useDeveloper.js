import { useState, useCallback } from 'react';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import { ACTION_TYPES } from '@constants/messageConstants.js';
import { useCallbacks } from '../hooks/useCallbacks.js';
import { Cmac } from '@/utils/Cmac.js';
import { biz3utils } from '@/utils/biz3utils.js';

const API = {
  WEBAPI_DEVICE_STATE: 'attendance_apifun_getshadow',
  WEBAPI_DEVICE_HISTORY: 'attendance_apifun_history',
  WEBAPI_DEVICE_TRIGGER: 'attendance_apifun_cmd',
};

export const useDeveloper = (gStripe, gAuth) => {
  const { registerCallback, invokeCallbacks } = useCallbacks();
  const [firmwares, setFirmwares] = useState([]);

  const handleAPIInfoResponse = useCallback(
    (message) => {
      invokeCallbacks(message);
      switch (message.action) {
        case ACTION_TYPES.BIZ3_LIST_FIRMWARE:
          console.log('BIZ3_LIST_FIRMWARE ==> message', message);
          setFirmwares(message.data);
          break;
        case ACTION_TYPES.BIZ3_INVOKE_WEBAPI:
          gStripe.getDevApiInfo();
          break;
        default:
          break;
      }
    },
    [gAuth]
  );

  useWebSocket(ACTION_TYPES.BIZ3_LIST_FIRMWARE, handleAPIInfoResponse);
  const getDownloadFireware = async () => {
    let msgData = {
      action: ACTION_TYPES.BIZ3_LIST_FIRMWARE,
    };
    sendMessage(msgData);
  };

  useWebSocket(ACTION_TYPES.BIZ3_INVOKE_WEBAPI, handleAPIInfoResponse);
  const invokeAPI = useCallback(
    async ({ func, query, body = {}, cb }) => {
      let msgData = {
        action: ACTION_TYPES.BIZ3_INVOKE_WEBAPI,
        op: func,
        apiKeyId: gStripe.apiKey.apiKeyId,
        query,
        body,
      };
      sendMessage(msgData);
      registerCallback(ACTION_TYPES.BIZ3_INVOKE_WEBAPI, msgData.op, cb);
    },
    [gStripe.apiKey.apiKeyId, registerCallback]
  );

  const getIoTDeviceState = useCallback(
    async (device_id, cb) => {
      return invokeAPI({ func: API.WEBAPI_DEVICE_STATE, query: { device_id }, cb });
    },
    [invokeAPI]
  );

  const getDeviceHistory = useCallback(
    async (device_id, cb) => {
      return invokeAPI({
        func: API.WEBAPI_DEVICE_HISTORY,
        query: {
          device_id,
          page: 0,
          lg: 5,
          isBiz: true,
        },
        cb,
      });
    },
    [invokeAPI]
  );

  const triggerDevice = useCallback(
    async ({ device_id, cmd, sescretKey }, cb) => {
      let uuid = gStripe.customerInfo.subUUID;
      const history = biz3utils.uuidBuffer(uuid);
      const sign = await Cmac.cmacTime(sescretKey);
      return invokeAPI({
        func: API.WEBAPI_DEVICE_TRIGGER,
        body: { cmd, history, sign, device_id },
        cb,
      });
    },
    [invokeAPI, gStripe.customerInfo.subUUID]
  );

  return {
    getDownloadFireware,
    firmwares,
    getIoTDeviceState,
    getDeviceHistory,
    triggerDevice,
  };
};
