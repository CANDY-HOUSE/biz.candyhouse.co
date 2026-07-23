import { useState, useCallback, useContext } from 'react';
import { ACTION_TYPES } from '@constants/messageConstants';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import { useCallbacks } from '../hooks/useCallbacks.js';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { biz3utils } from '@/utils/biz3utils.js';

// 红外遥控器相关的后台操作类型，统一在此声明，避免字符串散落各处
const IR_OPS = {
  getRemoteList: 'getRemoteList',
  searchRemoteList: 'searchRemoteList',
  sendIR: 'sendIR',
  updateRemoteState: 'updateRemoteState',
  addIRRemote: 'addIRRemote',
  deleteIRRemote: 'deleteIRRemote',
  updateRemoteAlias: 'updateRemoteAlias',
  getIRMode: 'getIRMode',
  setIRMode: 'setIRMode',
  subscribeIRMode: 'subscribeIRMode',
  subscribeIRModeRsp: 'subscribeIRModeRsp',
  subscribeIRData: 'subscribeIRData',
  subscribeIRDataRsp: 'subscribeIRDataRsp',
  unsubscribeIRMode: 'unsubscribeIRMode',
  unsubscribeIRData: 'unsubscribeIRData',
  matchRemote: 'matchRemote',
  getIRCodes: 'getIRCodes',
  addIRCode: 'addIRCode',
  updateIRCode: 'updateIRCode',
  deleteIRCode: 'deleteIRCode',
  addRemoteToMatter: 'addRemoteToMatter',
};

export const useRemoteCtrl = (gAuth, gStripe, setSnackbarValue) => {
  const [remoteList, setRemoteList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { t } = useTranslation();

  const [irModeSubscriptions, setIrModeSubscriptions] = useState(new Map());
  const [irDataSubscriptions, setIrDataSubscriptions] = useState(new Map());
  const { gManageDevice } = useContext(GlobalStateContext);

  let defaultPageSize = 200;

  const { registerCallback, invokeCallbacks } = useCallbacks();

  const handleRemoteResponse = (message) => {
    if (message.action !== ACTION_TYPES.BIZ3_IR_REMOTE) return;
    invokeCallbacks(message);

    setIsLoading(false);
    setIsLoadingMore(false);
    setIsSearching(false);

    if (!message.success) {
      console.log('Remote request error:', message.message);
      if (message.code === 406) {
        // 对于 406 错误，直接返回，静默处理：sb数据某些操作可能为空
        return;
      }
      setSnackbarValue({
        open: true,
        msg: message.message || 'リモコンリストの取得に失敗しました。',
      });
      return;
    }

    switch (message.op) {
      case IR_OPS.getRemoteList:
        const responseData = message.data || {};
        const list = responseData.data || [];
        const paginationInfo = responseData.pagination || {};

        console.log('remot list len', list.length);

        // 如果是第一页，替换数据；如果是后续页，追加数据
        const currentPage = paginationInfo.currentPage || 1;
        if (currentPage === 1) {
          setRemoteList(list);
        } else {
          setRemoteList((prevList) => [...prevList, ...list]);
        }
        break;

      case IR_OPS.searchRemoteList:
        const searchResponseData = message.data || {};
        const searchList = searchResponseData.data || [];
        console.log('search list len:', searchList.length);
        setSearchResults(searchList);
        break;
      case IR_OPS.sendIR:
        if (message.success) {
          setSnackbarValue({
            open: true,
            msg: t('pages.ir.remote.sendSuccess'),
            severity: 'success',
          });
        } else {
          console.error('红外码发送失败:', message.message);
          setSnackbarValue({
            open: true,
            msg: message.message || t('pages.ir.remote.sendFail'),
            severity: 'error',
          });
        }
        break;

      case IR_OPS.updateRemoteState:
        if (message.success) {
          console.log('device state update success:', message.data);
        } else {
          console.error('device state update failed:', message.message);
        }
        break;

      case IR_OPS.addIRRemote:
        if (message.success) {
          console.log('infrared remote control saved successfully:', message.data);
        } else {
          console.error('infrared remote control save failed:', message.message);
        }
        break;

      case IR_OPS.deleteIRRemote:
        if (message.success) {
          console.log('infrared remote control deleted successfully:', message.data);
        } else {
          console.error('infrared remote control delete failed:', message.message);
        }
        break;

      case IR_OPS.updateRemoteAlias:
        if (message.success) {
          console.log('device alias update success:', message.data);
        } else {
          console.error('device alias update failed:', message.message);
        }
        break;

      case IR_OPS.getIRMode:
        console.log('Received getIRMode response:', message.data);
        break;

      case IR_OPS.setIRMode:
        if (message.success) {
          console.log('IR mode set successfully:', message.data);
        } else {
          console.error('IR mode set failed:', message.message);
        }
        break;

      case IR_OPS.subscribeIRMode:
        if (message.success) {
          console.log('IR mode subscription successful');
        } else {
          console.error('IR mode subscription failed:', message.message);
        }
        break;

      case IR_OPS.subscribeIRModeRsp:
        console.log('Received subscribeIRModeRsp response:', message.data);
        handleIRModeSubscriptionResponse(message);
        break;

      case IR_OPS.subscribeIRDataRsp:
        console.log('Received subscribeIRDataRsp response:', message.data);
        handleIRDataSubscriptionResponse(message);
        break;

      case IR_OPS.subscribeIRData:
        console.log('Received subscribeIRData response:', message.data);
        if (message.success) {
          console.log('IR data subscription successful');
        } else {
          console.error('IR data subscription failed:', message.message);
        }
        break;

      case IR_OPS.unsubscribeIRMode:
        console.log('Received unsubscribeIRMode response:', message.data);
        break;

      case IR_OPS.unsubscribeIRData:
        console.log('Received unsubscribeIRData response:', message.data);
        break;

      case IR_OPS.matchRemote:
        console.log('Received matchRemote response:', message.data);
        break;

      case IR_OPS.getIRCodes:
        console.log('Received getIRCodes response:', message.data);
        break;

      case IR_OPS.addIRCode:
        if (message.success) {
          console.log('infrared button added successfully:', message.data);
        } else {
          console.error('infrared button add failed:', message.message);
          setSnackbarValue({
            open: true,
            msg: message.message || t('pages.ir.remote.addIRCodeFail'),
            severity: 'error',
          });
        }
        break;

      case IR_OPS.updateIRCode:
        if (message.success) {
          console.log('infrared button updated successfully:', message.data);
        } else {
          console.error('infrared button update failed:', message.message);
          setSnackbarValue({
            open: true,
            msg: message.message || t('pages.ir.remote.updateIRCodeFail'),
            severity: 'error',
          });
        }
        break;

      case IR_OPS.deleteIRCode:
        if (message.success) {
          console.log('infrared button deleted successfully:', message.data);
        } else {
          console.error('infrared button delete failed:', message.message);
          setSnackbarValue({
            open: true,
            msg: message.message || t('pages.ir.remote.deleteIRCodeFail'),
            severity: 'error',
          });
        }
        break;

      case IR_OPS.addRemoteToMatter:
        if (message.success) {
          console.log('IR remote added to Matter successfully:', message.data);
        } else {
          console.error('IR remote add to Matter failed:', message.message);
        }
        break;

      default:
        break;
    }
  };

  /**
   * 检查是否可以添加更多遥控器
   * @param {object} remoteDevice - 红外设备对象
   * @returns {boolean} - 是否可以添加更多遥控器
   */
  const canAddMoreRemote = useCallback(
    (remoteDevice) => {
      if (remoteDevice.type === 0xfe00) {
        // 自学习遥控器不受限制
        return true;
      }
      const foundDevice = gManageDevice?.companyDevices?.find((item) => item.deviceUUID === remoteDevice.deviceUUID);
      if (!foundDevice) {
        console.warn(`Device with ID ${remoteDevice.deviceUUID} not found`);
        return true;
      }
      const remoteList = foundDevice.stateInfo?.remoteList || [];
      let counts = 0;
      for (let remote of remoteList) {
        if (remote.type === 0x8000 || remote.type === 0x2000 || remote.type === 0xe000 || remote.type === 0xc000) {
          counts++;
        }
      }
      // 如果超过限制，显示提示信息
      if (counts >= 3) {
        setSnackbarValue({
          open: true,
          msg: t('pages.ir.remote.toMaxRemoteLimit'),
          severity: 'warning',
        });
      }
      return counts < 3;
    },
    [gManageDevice?.companyDevices, setSnackbarValue, t]
  );
  /**
   * 更新本地遥控器列表
   * @param {*} remoteToSave
   * @returns
   */

  const updateLocalRemoteList = useCallback(
    (hub3DeviceId, updateRemote, isDelete = false) => {
      biz3utils.triggerBridge({
        action: 'requestRefreshApp',
      });

      const foundDevice = gManageDevice?.companyDevices?.find((item) => item.deviceUUID === hub3DeviceId);
      if (!foundDevice) {
        console.warn(`Device with ID ${hub3DeviceId} not found`);
        return;
      }
      const currentRemoteList = foundDevice.stateInfo?.remoteList || [];

      let newRemoteList;
      if (isDelete) {
        newRemoteList = currentRemoteList.filter((remote) => remote.uuid !== updateRemote.uuid);
      } else {
        const existingIndex = currentRemoteList.findIndex((remote) => remote.uuid === updateRemote.uuid);
        if (existingIndex >= 0) {
          newRemoteList = currentRemoteList.map((remote) =>
            remote.uuid === updateRemote.uuid ? updateRemote : remote
          );
        } else {
          newRemoteList = [updateRemote, ...currentRemoteList];
        }
      }

      const updatedCompanyDevices = gManageDevice.companyDevices.map((device) =>
        device.deviceUUID === hub3DeviceId
          ? {
              ...device,
              stateInfo: {
                ...device.stateInfo,
                remoteList: newRemoteList,
              },
            }
          : device
      );
      gManageDevice.setCompanyDevices(updatedCompanyDevices);
    },
    [gManageDevice, gManageDevice?.companyDevices]
  );

  // 处理 IR 模式订阅响应
  const handleIRModeSubscriptionResponse = useCallback(
    (message) => {
      // 通知所有 IR 模式订阅者
      irModeSubscriptions.forEach((callback, deviceId) => {
        try {
          callback(message);
        } catch (error) {
          console.error(`IR mode subscription callback execution failed (device: ${deviceId}):`, error);
        }
      });
    },
    [irModeSubscriptions]
  );

  // 处理 IR 数据订阅响应
  const handleIRDataSubscriptionResponse = useCallback(
    (message) => {
      // 通知所有 IR 数据订阅者
      irDataSubscriptions.forEach((callback, deviceId) => {
        try {
          callback(message);
        } catch (error) {
          console.error(`IR data subscription callback execution failed (device: ${deviceId}):`, error);
        }
      });
    },
    [irDataSubscriptions]
  );

  useWebSocket(ACTION_TYPES.BIZ3_IR_REMOTE, handleRemoteResponse);

  // 发送消息给 Hub3WebSocket
  const handleSendMessage = (message) => {
    sendMessage(message);
  };

  /**
   * 获取遥控器列表
   * @param {string} type - 红外类型
   * @param {number} page - 页码，默认为1
   * @param {number} pageSize - 每页数量，默认为200
   * @param {function} cb - 回调函数（可选）
   */
  const getRemoteList = useCallback(
    (type, page = 1, pageSize = defaultPageSize, cb) => {
      console.log(`Requesting remote list - Type: ${type}, Page: ${page}, Page Size: ${pageSize}`);

      // 如果是第一页，显示主加载状态；如果是后续页，显示加载更多状态
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.getRemoteList,
        type: type,
        companyID: companyID,
        pagination: {
          page: page,
          pageSize: pageSize,
        },
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, setSnackbarValue, gStripe.customerInfo.companyID]
  );

  /**
   * 搜索遥控器列表
   * @param {string} type - 红外类型
   * @param {string} keyword - 搜索关键词
   * @param {function} cb - 回调函数（可选）
   */
  const searchRemoteList = useCallback(
    (type, keyword, cb) => {
      if (!type) {
        console.error('Type is required for searchRemoteList');
        return;
      }

      if (!keyword || keyword.trim().length === 0) {
        console.log('Search keyword is empty, clearing search results');
        setSearchResults([]);
        return;
      }

      console.log(`Searching remote list - Type: ${type}, Keyword: ${keyword}`);
      setIsSearching(true);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.searchRemoteList,
        type: type,
        companyID: companyID,
        searchTerm: keyword.trim(),
        pagination: {
          page: 1,
          pageSize: 1000, // Search results return up to 1000 items
        },
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 加载下一页数据
   * @param {string} type - 红外类型
   * @param {object} pagination - 当前分页信息
   * @param {function} cb - 回调函数（可选）
   */
  const loadMoreRemotes = useCallback(
    (type, pagination, cb) => {
      if (!pagination.hasMore || pagination.isLoadingMore) {
        console.log('Cannot load more:', { pagination });
        return;
      }

      const nextPage = pagination.currentPage + 1;
      getRemoteList(type, nextPage, pagination.pageSize, cb);
    },
    [getRemoteList]
  );

  /**
   * 清空搜索结果
   */
  const clearSearchResults = useCallback(() => {
    console.log('Clearing search results');
    setSearchResults([]);
  }, []);

  /**
   * 发送红外码
   * @param {string} deviceId - 设备ID
   * @param {string} command - 红外码命令
   * @param {string} operation - 操作类型
   * @param {string} irType - 红外类型
   * @param {function} cb - 回调函数（可选）
   */
  const sendIR = useCallback(
    (deviceId, remoteId, command, operation, irType, cb) => {
      console.log(
        `Sending IR code - Device: ${deviceId}, Command: ${command}, Operation: ${operation}, Type: ${irType}`
      );

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.sendIR,
        deviceId: deviceId,
        command: command,
        operation: operation,
        irType: irType,
        companyID: companyID,
        irDeviceUUID: remoteId,
      };

      handleSendMessage(message);
      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, setSnackbarValue, gStripe.customerInfo.companyID]
  );

  /**
   * 更新红外设备状态
   * @param {string} hub3DeviceId - Hub3设备ID
   * @param {string} remoteId - 遥控器 UUID
   * @param {string} state - 设备状态
   * @param {function} cb - 回调函数（可选）
   */
  const updateRemoteState = useCallback(
    (hub3DeviceId, remoteId, state, cb) => {
      console.log(`Updating remote state - Device: ${hub3DeviceId}, remoteId: ${remoteId}, State: ${state}`);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.updateRemoteState,
        deviceId: hub3DeviceId,
        uuid: remoteId,
        state: state,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 添加红外遥控器
   * @param {object} remoteDevice - 遥控器设备对象
   * @param {function} cb - 回调函数（可选）
   */
  const addIRRemote = useCallback(
    (remoteDevice, cb) => {
      console.log(`Adding IR remote - Remote:`, remoteDevice);

      if (!canAddMoreRemote(remoteDevice)) {
        console.log('已达到遥控器数量限制');
        if (cb && typeof cb === 'function') {
          cb({ success: false, message: t('pages.ir.remote.toMaxRemoteLimit') });
        }
        return;
      }

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.addIRRemote,
        remote: remoteDevice,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 删除红外遥控器
   * @param {string} hub3DeviceId - Hub3设备ID
   * @param {string} uuid - 遥控器 UUID
   * @param {function} cb - 回调函数（可选）
   */
  const deleteIRRemote = useCallback(
    (hub3DeviceId, uuid, cb) => {
      console.log(`Deleting IR remote - Device: ${hub3DeviceId}, Remote ID: ${uuid}`);
      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.deleteIRRemote,
        hub3DeviceId: hub3DeviceId,
        uuid: uuid,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 修改红外遥控器别名
   * @param {string} hub3DeviceId - Hub3设备ID
   * @param {string} uuid - 遥控器 UUID
   * @param {string} alias - 新的别名
   * @param {function} cb - 回调函数（可选）
   */
  const modifyIRRemote = useCallback(
    (hub3DeviceId, uuid, alias, cb) => {
      console.log(`Modifying IR remote alias - Device: ${hub3DeviceId}, uuid: ${uuid}, Alias: ${alias}`);
      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.updateRemoteAlias,
        deviceId: hub3DeviceId,
        uuid: uuid,
        alias: alias,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 获取IR模式
   * @param {string} deviceId - 设备ID
   * @param {function} cb - 回调函数（可选）
   */
  const getIRMode = useCallback(
    (deviceId, cb) => {
      console.log(`Getting IR mode - Device: ${deviceId}`);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.getIRMode,
        deviceId: deviceId,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 设置IR模式
   * @param {string} deviceId - 设备ID
   * @param {number} mode - IR模式 (0: CONTROL, 1: REGISTER)
   * @param {function} cb - 回调函数（可选）
   */
  const setIRMode = useCallback(
    (deviceId, mode, cb) => {
      console.log(`Setting IR mode - Device: ${deviceId}, Mode: ${mode}`);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.setIRMode,
        deviceId: deviceId,
        mode: mode,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 订阅IR模式变化
   * @param {string} deviceId - 设备ID
   * @param {function} cb - 回调函数（可选）
   */
  const subscribeIRMode = useCallback(
    (deviceId, cb) => {
      const topic = `hub3/${deviceId}/ir/mode`;
      console.log(`Subscribing to IR mode - Device: ${deviceId}, Topic: ${topic}`);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.subscribeIRMode,
        topic: topic,
        deviceId: deviceId,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        setIrModeSubscriptions((prev) => new Map(prev.set(deviceId, cb)));
        console.log(`IR mode subscription callback registered - Device: ${deviceId}`);
      }
      registerCallback(message.action, IR_OPS.subscribeIRMode, (response) => {
        console.log('IR mode subscription confirmed:', response);
      });
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 订阅IR数据
   * @param {string} deviceId - 设备ID
   * @param {function} cb - 回调函数（可选）
   */
  const subscribeIRData = useCallback(
    (deviceId, cb) => {
      const topic = `hub3/${deviceId}/ir/learned/data`;
      console.log(`Subscribing to IR data - Device: ${deviceId}, Topic: ${topic}`);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.subscribeIRData,
        topic: topic,
        deviceId: deviceId,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        setIrDataSubscriptions((prev) => new Map(prev.set(deviceId, cb)));
      }

      registerCallback(message.action, IR_OPS.subscribeIRData, (_response) => {});
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 取消订阅IR模式
   * @param {string} deviceId - 设备ID
   */
  const unsubscribeIRMode = useCallback(
    (deviceId) => {
      console.log(`Unsubscribing from IR mode - Device: ${deviceId}`);
      const topic = `hub3/${deviceId}/ir/mode`;
      setIrModeSubscriptions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(deviceId);
        return newMap;
      });

      // 发送取消订阅消息
      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.unsubscribeIRMode,
        deviceId: deviceId,
        topic: topic,
        companyID: companyID,
      };
      handleSendMessage(message);
    },
    [handleSendMessage, gStripe.customerInfo.companyID]
  );

  /**
   * 取消订阅IR数据
   * @param {string} deviceId - 设备ID
   */
  const unsubscribeIRData = useCallback(
    (deviceId) => {
      console.log(`Unsubscribing from IR data - Device: ${deviceId}`);
      const topic = `hub3/${deviceId}/ir/learned/data`;
      setIrDataSubscriptions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(deviceId);
        return newMap;
      });

      // 发送取消订阅消息
      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.unsubscribeIRData,
        deviceId: deviceId,
        topic: topic,
        companyID: companyID,
      };
      handleSendMessage(message);
    },
    [handleSendMessage, gStripe.customerInfo.companyID]
  );

  /**
   * 匹配遥控器
   * @param {ArrayBuffer|Uint8Array} irData - IR数据
   * @param {number} irType - IR类型
   * @param {string} model - 设备型号
   * @param {function} cb - 回调函数（可选）
   */
  const matchRemote = useCallback(
    (irData, irType, model, cb) => {
      console.log(`Matching remote - Type: ${irType}, Model: ${model}, Data size: ${irData.length}`);
      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.matchRemote,
        irData: irData,
        irWaveLength: irData.length / 2,
        irType: irType,
        brandName: model,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 获取红外按键列表
   * @param {string} hub3DeviceId - Hub3设备ID
   * @param {string} remoteId - 红外设备UUID
   * @param {function} cb - 回调函数（可选）
   */
  useWebSocket(ACTION_TYPES.BIZ3_IR_REMOTE, handleRemoteResponse);
  const getIRCodes = useCallback(
    (hub3DeviceId, remoteId, cb) => {
      console.log(`Getting IR codes - Device: ${hub3DeviceId}, UUID: ${remoteId}`);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.getIRCodes,
        hub3DeviceId: hub3DeviceId,
        remoteId: remoteId,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 添加红外按键
   * @param {object} irCode - 红外按键对象
   * @param {function} cb - 回调函数（可选）
   */
  const addIRCode = useCallback(
    (irCode, cb) => {
      console.log(`Adding IR code - Code:`, irCode);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.addIRCode,
        irCode: irCode,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 更新红外按键
   * @param {string} hub3DeviceId - Hub3设备ID
   * @param {string} remoteId - 自学习设备ID
   * @param {string} keyId - 红外按键ID
   * @param {object} name - 更新的字段
   * @param {function} cb - 回调函数（可选）
   */
  const updateIRCode = useCallback(
    (hub3DeviceId, remoteId, keyId, name, cb) => {
      console.log(`Updating IR code - Device: ${remoteId}, Key ID: ${keyId}, Update:`, name);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.updateIRCode,
        hub3DeviceId: hub3DeviceId,
        remoteId: remoteId,
        keyUUID: keyId,
        name: name,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 删除红外按键
   * @param {string} hub3DeviceId - Hub3设备ID
   * @param {string} remoteId - 遥控器ID
   * @param {string} keyUUID - 红外按键ID
   * @param {function} cb - 回调函数（可选）
   */
  const deleteIRCode = useCallback(
    (hub3DeviceId, remoteId, keyUUID, cb) => {
      console.log(`Deleting IR code - Device: ${hub3DeviceId}, Key ID: ${keyUUID}`);

      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.deleteIRCode,
        hub3DeviceId: hub3DeviceId,
        remoteId: remoteId,
        keyUUID: keyUUID,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  /**
   * 添加红外遥控器到 Matter
   * @param {string} hub3DeviceId - Hub3设备ID
   * @param {string} onCommand - 开机命令
   * @param {string} offCommand - 关机命令
   * @param {object} irRemote - 红外遥控器对象 (包含 type, uuid, alias)
   * @param {function} cb - 回调函数（可选）
   */
  const addRemoteToMatter = useCallback(
    (hub3DeviceId, onCommand, offCommand, irRemote, cb) => {
      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_IR_REMOTE,
        op: IR_OPS.addRemoteToMatter,
        hub3DeviceId: hub3DeviceId,
        irDeviceType: irRemote.type,
        cmdOn: onCommand,
        cmdOff: offCommand,
        irDeviceUUID: irRemote.uuid,
        irDeviceName: irRemote.alias,
        companyID: companyID,
      };

      handleSendMessage(message);

      if (cb && typeof cb === 'function') {
        registerCallback(message.action, message.op, cb);
      }
    },
    [handleSendMessage, registerCallback, gStripe.customerInfo.companyID]
  );

  return {
    // 状态
    remoteList,
    searchResults,
    isLoading,
    isLoadingMore,
    isSearching,

    // 方法
    getRemoteList,
    searchRemoteList,
    loadMoreRemotes,
    clearSearchResults,
    setRemoteList,
    setIsLoading,
    setSearchResults,
    sendIR,
    updateRemoteState,
    addIRRemote,
    deleteIRRemote,
    modifyIRRemote,
    getIRMode,
    setIRMode,
    subscribeIRMode,
    subscribeIRData,
    unsubscribeIRMode,
    unsubscribeIRData,
    matchRemote,
    getIRCodes,
    addIRCode,
    updateIRCode,
    deleteIRCode,
    addRemoteToMatter,
    updateLocalRemoteList,
  };
};
