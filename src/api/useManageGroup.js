import { useCallback, useState } from 'react';
import { ACTION_TYPES } from '@constants/messageConstants';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import { useCallbacks } from '../hooks/useCallbacks.js';

const useManageGroup = (gStripe) => {
  const init = { count: 0, Items: [] };
  const [deviceGroups, setDeviceGroups] = useState(init);
  const { registerCallback, invokeCallbacks } = useCallbacks();

  const getDeviceGroups = useCallback(() => {
    const companyID = gStripe.customerInfo.companyID;
    if (!companyID) return;
    sendMessage({
      action: ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP,
      cid: companyID,
      op: 'getGroups',
    });
  }, [gStripe.customerInfo.companyID]);

  const handleDeviceResponse = useCallback(
    (message) => {
      invokeCallbacks(message);
      switch (message.action) {
        case ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP:
          switch (message.op) {
            case 'getGroups':
              const data = {
                count: message.data.length,
                Items: message.data,
              };
              setDeviceGroups(data);
              break;
            case 'deleteGroups':
              getDeviceGroups();
              break;
            case 'add':
              getDeviceGroups();
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    },
    [invokeCallbacks, getDeviceGroups]
  );

  const handleDeviceToEmployeeResponse = useCallback(
    (message) => {
      invokeCallbacks(message);
      switch (message.action) {
        case ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_DEVICE:
          // Handle employee device response
          break;
        default:
          break;
      }
    },
    [invokeCallbacks]
  );

  useWebSocket(ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP, handleDeviceResponse);

  const removeDeviceGroups = useCallback(
    (groupIds) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const objsWithCid = groupIds.map((obj) => ({
        ...obj,
        cid: companyID,
      }));
      sendMessage({
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP,
        objs: objsWithCid,
        op: 'deleteGroups',
      });
    },
    [gStripe.customerInfo.companyID]
  );

  const addDeviceGroup = useCallback(
    (name, ids, cb) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const data = {
        name,
        cid: companyID,
        uuids: ids,
      };
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP,
        obj: { ...data },
        op: 'add',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  useWebSocket(ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_DEVICE, handleDeviceToEmployeeResponse);

  const shareDeviceKeysToEmployees = useCallback(
    (items, cb) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_DEVICE,
        items,
        op: 'add',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const shareDeviceGroupKeysToEmployeeGroup = useCallback(
    (item, cb) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_DEVICE,
        ...item,
        companyID,
        op: 'group',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const getEmployeeDeviceKeys = useCallback(
    (subUUID, cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_DEVICE,
        subUUID,
        op: 'get',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [registerCallback]
  );

  const removeEmployeeDeviceKey = useCallback(
    (data, cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_DEVICE,
        ...data,
        op: 'del',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [registerCallback]
  );

  const updateGuestKeyTag = useCallback(
    (data, cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_DEVICE,
        ...data,
        op: 'updateGuestTag',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [registerCallback]
  );

  const generateQRToken = useCallback(
    (data, cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_DEVICE,
        ...data,
        op: 'generateQRToken',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [registerCallback]
  );

  const redeemQRToken = useCallback(
    (qrToken, cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_DEVICE,
        qrToken,
        op: 'redeemQRToken',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [registerCallback]
  );

  const getEmployeeGroup = useCallback(
    (gid, cb) => {
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP,
        gid,
        op: 'getBindUserGroup',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [registerCallback]
  );

  const removeEmployeeGroup = useCallback(
    (data, cb) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP,
        cid: companyID,
        ...data,
        op: 'removeBindUserGroup',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const removeDeviceInGroup = useCallback(
    (gid, uuids, items, cb) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const params = items.map((item) => ({
        deviceUUID: item.deviceUUID,
        secretKey: item.secretKey,
      }));
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP,
        cid: companyID,
        gid,
        uuids,
        items: params,
        op: 'removeBindDevice',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const addDeviceInGroup = useCallback(
    (gid, uuids, items, cb) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP,
        cid: companyID,
        gid,
        uuids,
        items,
        op: 'addBindDevice',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  useWebSocket(ACTION_TYPES.BIZ3_GET_DEVICEEMOLOYEEKEYS, handleDeviceResponse);

  const getDeviceEmployeeKeys = useCallback(
    ({ deviceUUID, limit }, cb) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const op = limit > 0 ? 'getLimited' : 'get';
      const msgData = {
        action: ACTION_TYPES.BIZ3_GET_DEVICEEMOLOYEEKEYS,
        deviceUUID,
        companyID,
        limit,
        op,
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  useWebSocket(ACTION_TYPES.BIZ3_GET_DEVICEHISTORY, handleDeviceResponse);

  const getDeviceHistory = useCallback(
    (list, cb, pageSize = null) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const msgData = {
        action: ACTION_TYPES.BIZ3_GET_DEVICEHISTORY,
        companyID,
        list,
        pageSize,
        op: 'getHistory',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const makeInvisibleHistory = useCallback(
    ({ deviceUUID, timestamp }, cb) => {
      const msgData = {
        action: ACTION_TYPES.BIZ3_GET_DEVICEHISTORY,
        deviceUUID,
        timestamp,
        op: 'makeInvisible',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [registerCallback]
  );

  const getHistoryEnv = useCallback(
    ({ deviceUUID, timestamp }, cb) => {
      const msgData = {
        action: ACTION_TYPES.BIZ3_GET_DEVICEHISTORY,
        deviceUUID,
        timestamp,
        op: 'getEnv',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [registerCallback]
  );

  const postDeviceGroupInfo = useCallback(
    (item, cb) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE_GROUP,
        obj: {
          cid: companyID,
          ...item,
        },
        op: 'update',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  return {
    deviceGroups,
    getDeviceGroups,
    removeDeviceGroups,
    addDeviceGroup,
    shareDeviceKeysToEmployees,
    shareDeviceGroupKeysToEmployeeGroup,
    getEmployeeGroup,
    postDeviceGroupInfo,
    removeEmployeeGroup,
    removeDeviceInGroup,
    addDeviceInGroup,
    getDeviceEmployeeKeys,
    getDeviceHistory,
    getEmployeeDeviceKeys,
    removeEmployeeDeviceKey,
    updateGuestKeyTag,
    generateQRToken,
    redeemQRToken,
    makeInvisibleHistory,
    getHistoryEnv,
  };
};

export default useManageGroup;
