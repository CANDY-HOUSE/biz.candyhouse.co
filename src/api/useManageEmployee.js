import { useCallback, useEffect, useState } from 'react';
import { gConfig } from '@constants/gConfig';
import { ACTION_TYPES } from '@constants/messageConstants';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import { useCallbacks } from '../hooks/useCallbacks.js';

const PubedEmployees = 'pubEmployees';
export const useManageEmployee = (gAuth, gStripe, setSnackbarValue) => {
  const init = { count: 0, Items: [] };
  const [employees, setEmployees] = useState(init);
  const [employeeGroups, setEmployeeGroups] = useState(null);
  const [tags, setTags] = useState([]);
  const { registerCallback, invokeCallbacks } = useCallbacks();

  const getEmployees = useCallback(() => {
    let companyID = gStripe.customerInfo.companyID;
    if (!companyID) return;
    sendMessage({
      action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE,
      companyID,
      op: 'get',
    });
  }, [gStripe.customerInfo.companyID]);

  const getEmployeeGroups = useCallback(() => {
    let companyID = gStripe.customerInfo.companyID;
    if (!companyID) return;
    sendMessage({
      action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP,
      cid: companyID,
      op: 'getGroups',
    });
  }, [gStripe.customerInfo.companyID]);

  const getTags = useCallback(() => {
    let companyID = gStripe.customerInfo.companyID;
    if (!companyID) return;
    sendMessage({
      action: ACTION_TYPES.BIZ3_MANAGE_ROLE,
      companyID,
      op: 'get',
    });
  }, [gStripe.customerInfo.companyID]);

  const handleEmployeeGroup = useCallback(
    (message) => {
      switch (message.op) {
        case 'getGroups':
          setEmployeeGroups(message.data);
          break;
        case 'add':
          setEmployeeGroups((prevState) => [...prevState, { ...message.data }]);
          break;
        case 'deleteGroups':
          getEmployeeGroups();
          break;
        default:
          break;
      }
    },
    [getEmployeeGroups]
  );

  const handleEmployee = useCallback(
    (message) => {
      switch (message.op) {
        case 'get':
          break;
        case PubedEmployees:
          const {
            totalCount,
            data: { list, page },
          } = message.data;
          setEmployees((prevState) => {
            if (page === 1) {
              return {
                count: totalCount,
                Items: [...list],
              };
            } else {
              return {
                count: prevState.count,
                Items: [...prevState.Items, ...list],
              };
            }
          });
          break;
        case 'add':
          if (!message.success) {
            if (message.message === 'Limit Exceeded') {
              setSnackbarValue({
                open: true,
                msg: 'ユーザー数の上限に達しました。プランのアップグレードが必要です。',
              });
            } else {
              setSnackbarValue({ open: true, msg: message.message });
            }
            return;
          }
          getEmployees();
          break;
        case 'update':
          getEmployees();
          break;
        case 'delete':
          getEmployees();
          break;
        default:
          break;
      }
    },
    [setSnackbarValue, getEmployees]
  );

  const handleRoleResponse = useCallback(
    (message) => {
      if (message.action !== ACTION_TYPES.BIZ3_MANAGE_ROLE) return;
      invokeCallbacks(message);
      if (!message.success) {
        setSnackbarValue({ open: true, msg: message.message });
        return;
      }
      switch (message.op) {
        case 'get':
          setTags(message.data);
          break;
        case 'delete':
          getTags();
          break;
        case 'post':
          getTags();
          break;
        default:
          break;
      }
    },
    [invokeCallbacks, setSnackbarValue, getTags]
  );

  const handleEmployeesResponse = useCallback(
    (message) => {
      invokeCallbacks(message);
      switch (message.action) {
        case ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE:
          handleEmployee(message);
          break;
        case ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP:
          handleEmployeeGroup(message);
          break;
        case ACTION_TYPES.BIZ3_MANAGE_ROLE:
          handleRoleResponse(message);
          break;
        default:
          break;
      }
    },
    [invokeCallbacks, handleEmployee, handleEmployeeGroup, handleRoleResponse]
  );

  const findEmployeeById = useCallback(
    (id) => {
      let find = employees.Items.find((item) => item.subUUID === id);
      return find ?? {};
    },
    [employees.Items]
  );

  const postEmployeeInfo = useCallback(
    (data, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE,
        obj: {
          companyID,
          ...data,
        },
        op: 'update',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const getCurrentUserInfo = useCallback(
    (cb) => {
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE,
        op: 'currentInfo',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [registerCallback]
  );

  const removeEmployees = useCallback(
    async (items, cb) => {
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE,
        items,
        op: 'delete',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [registerCallback]
  );

  const addEmployeeGroup = useCallback(
    (item, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP,
        obj: {
          cid: companyID,
          ...item,
        },
        op: 'add',
      };
      sendMessage(messageData);
      registerCallback(ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const postEmployeeGroupInfo = useCallback(
    (item, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP,
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

  const removeEmployeeGroups = useCallback(
    (gids) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP,
        objs: gids,
        cid: companyID,
        op: 'deleteGroups',
      };
      sendMessage(messageData);
    },
    [gStripe.customerInfo.companyID]
  );

  const addEmployee = useCallback(
    (items, cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE,
        items,
        op: 'add',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [registerCallback]
  );

  const reorderEmployees = useCallback(
    (items, cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE,
        items,
        op: 'order',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [registerCallback]
  );

  const postTag = useCallback(
    (data, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_ROLE,
        companyID,
        ...data,
        op: 'post',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const removeTag = useCallback(
    (data, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_ROLE,
        companyID,
        ...data,
        op: 'delete',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const getDeviceGroup = useCallback(
    (gid, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP,
        gid,
        op: 'getBindDeviceGroup',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const addEmployeeInGroup = useCallback(
    (gid, uuids, items, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP,
        cid: companyID,
        gid,
        uuids,
        items,
        op: 'addBindUser',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const removeEmployeeInGroup = useCallback(
    (gid, uuids, items, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const params = items.map((item) => ({
        subUUID: item.subUUID,
      }));
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP,
        cid: companyID,
        gid,
        uuids,
        items: params,
        op: 'removeBindUser',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const removeDeviceGroup = useCallback(
    (data, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP,
        cid: companyID,
        ...data,
        op: 'removeBindDeviceGroup',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const queryByCS = useCallback(
    (keyword, cb) => {
      if (!keyword) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE,
        keyword,
        op: 'queryByCS',
      };
      let rowDatas = [];
      const handleChunk = (res) => {
        if (res?.success === false) {
          cb?.(res);
          return;
        }
        const { data = {}, totalPage } = res.data ?? {};
        const { totalCount = 0 } = res.data ?? {};
        const { list = [], page = 1 } = data;
        rowDatas = [...rowDatas, ...list];
        const isDone = page === totalPage;
        cb?.({ ...res, data: rowDatas, page, totalPage, totalCount, done: isDone });
        if (!isDone) {
          registerCallback(messageData.action, 'pubQueryByCS', handleChunk);
        }
      };
      sendMessage(messageData);
      registerCallback(messageData.action, 'pubQueryByCS', handleChunk);
    },
    [sendMessage, registerCallback]
  );

  const confirmQueryByCS = useCallback(
    (email, cb) => {
      if (!email) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE,
        email,
        op: 'confirmQueryByCS',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [sendMessage, registerCallback]
  );

  useEffect(() => {
    if (gAuth.loginState === gConfig.loginState.loginOut) {
      setEmployees(init);
    }
  }, [gAuth.loginState]);

  useEffect(() => {
    if (gStripe.isFromApp) {
      return;
    }
    getEmployees();
  }, [gStripe.isFromApp, gStripe.customerInfo.companyID, getEmployees]);

  useWebSocket(ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE, handleEmployeesResponse);
  useWebSocket(ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE_GROUP, handleEmployeesResponse);
  useWebSocket(ACTION_TYPES.BIZ3_MANAGE_ROLE, handleEmployeesResponse);

  return {
    employees,
    getEmployees,
    getEmployeeGroups,
    employeeGroups,
    addEmployeeGroup,
    removeEmployeeGroups,
    addEmployee,
    removeEmployees,
    tags,
    getTags,
    removeTag,
    postTag,
    getDeviceGroup,
    addEmployeeInGroup,
    removeEmployeeInGroup,
    removeDeviceGroup,
    postEmployeeInfo,
    getCurrentUserInfo,
    postEmployeeGroupInfo,
    findEmployeeById,
    reorderEmployees,
    queryByCS,
    confirmQueryByCS,
  };
};
//
