import { useEffect, useState, useCallback, useRef } from 'react';
import { gUtils } from '@/utils/gUtils';
import { gConfig } from '@constants/gConfig';
import { ACTION_TYPES } from '@constants/messageConstants';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import { useCallbacks } from '../hooks/useCallbacks.js';

const PubedCompanyDevice = 'PubedCompanyDevice';
const PubedUserDevice = 'PubedUserDevice';
export const useManageDevice = (gAuth, gStripe, setSnackbarValue) => {
  const [filteredSsmDevices, setFilteredSsmDevices] = useState([]); //公司用户ssm设备
  const [filteredAccessControlDevices, setFilteredAccessControlDevices] = useState([]); //公司用户认证机器
  const [canChoosedAccessControlDevices, setCanChoosedAccessControlDevices] = useState([]); //用户可选择的认证机器
  const [canChoosedSsmDevices, setCanChoosedSsmDevices] = useState([]); //用户可选择的ssm设备
  const [userDevices, setUserDevices] = useState([]); //个人用户所有设备
  const [companyDevices, setCompanyDevices] = useState([]); //公司用户所有设备
  const { registerCallback, invokeCallbacks } = useCallbacks();
  const tempCompanyDevicesRef = useRef([]); //临时存储公司设备数据
  const tempUserDevicesRef = useRef([]); //临时个人设备数据

  const handleManageDeviceResponse = useCallback(
    (message) => {
      if (message.action !== ACTION_TYPES.BIZ3_MANAGE_DEVICE) return;
      invokeCallbacks(message);
      if (!message.success) {
        if (message.message === 'Limit Exceeded') {
          setSnackbarValue({ open: true, msg: 'デバイス数の上限に達しました。プランのアップグレードが必要です。' });
        } else {
          setSnackbarValue({ open: true, msg: message.message });
        }
        return;
      }
      switch (message.op) {
        case PubedCompanyDevice:
        case PubedUserDevice:
          const {
            totalPage,
            data: { list, page },
          } = message.data;
          const tmpRef = message.op === PubedCompanyDevice ? tempCompanyDevicesRef : tempUserDevicesRef;
          if (page === 1) {
            tmpRef.current = [...list];
          } else {
            tmpRef.current = [...tmpRef.current, ...list];
          }
          if (totalPage === page) {
            if (message.op === PubedCompanyDevice) {
              setCompanyDevices(tmpRef.current);
              subscribeDevices(tmpRef.current);
            } else {
              setUserDevices(tmpRef.current);
            }
          }
          break;
        case 'add':
          getCompanyDevices();
          break;
        case 'del':
          getCompanyDevices();
          break;
        case 'updateName':
          const context = message.reqContext;
          if (context && context.deviceUUID) {
            setCompanyDevices((prevDevices) => {
              const updatedDevices = prevDevices.map((device) => {
                if (device.deviceUUID === context.deviceUUID) {
                  return {
                    ...device,
                    deviceName: context.deviceName,
                  };
                }
                return device;
              });
              return updatedDevices;
            });
          }
          break;
        case 'reorderDevices':
          setCompanyDevices(message.data);
          break;
        default:
          break;
      }
    },
    [gAuth, gStripe]
  );

  useWebSocket(ACTION_TYPES.BIZ3_MANAGE_DEVICE, handleManageDeviceResponse);

  // 发送消息给 Hub3WebSocket
  const handleSendMessage = (message) => {
    if (gStripe.isFromApp) {
      return;
    }
    sendMessage(message);
  };

  useEffect(() => {
    if (gAuth.loginState === gConfig.loginState.loginOut) {
      setFilteredSsmDevices([]);
      setFilteredAccessControlDevices([]);
      setCanChoosedAccessControlDevices([]);
      setCanChoosedSsmDevices([]);
      setUserDevices([]);
    }
  }, [gAuth.loginState]);

  useEffect(() => {
    const willDisplayedSsmDevices = companyDevices.filter((item) => {
      return gUtils.isLockModel(item.deviceModel);
    });
    setFilteredSsmDevices(willDisplayedSsmDevices);
    const willDisplayedAcDevices = companyDevices.filter((item) => {
      return gUtils.isSesameAccessControlDevice(item.deviceModel);
    });
    setFilteredAccessControlDevices(willDisplayedAcDevices);
  }, [companyDevices]);

  useEffect(() => {
    setCanChoosedAccessControlDevices(
      userDevices.filter((item) => {
        if (gUtils.isSesameAccessControlDevice(item.deviceModel) && gUtils.isDeviceKeyOwner(item.keyLevel)) {
          return !filteredAccessControlDevices.some((it) => it.deviceUUID === item.deviceUUID);
        }
        return false;
      })
    );
    setCanChoosedSsmDevices(
      userDevices.filter((item) => {
        if (gUtils.isLockModel(item.deviceModel) && gUtils.isDeviceKeyOwner(item.keyLevel)) {
          return !filteredSsmDevices.some((it) => it.deviceUUID === item.deviceUUID);
        }
        return false;
      })
    );
  }, [userDevices, filteredAccessControlDevices, filteredSsmDevices]);

  const updateDeviceState = useCallback(
    (updatedDevice) => {
      const deviceInSsm = filteredSsmDevices.some((device) => device.deviceUUID === updatedDevice.deviceUUID);
      const deviceInAccessControl = filteredAccessControlDevices.some(
        (device) => device.deviceUUID === updatedDevice.deviceUUID
      );
      if (deviceInSsm) {
        let shouldUpdate = true;
        // 如果 wm2State 为 true，必须有 CHSesame2Status 值才能更新
        if (
          updatedDevice.stateInfo.wm2State === true &&
          (!updatedDevice.stateInfo.CHSesame2Status || updatedDevice.stateInfo.CHSesame2Status === '')
        ) {
          shouldUpdate = false;
        }
        shouldUpdate &&
          setCompanyDevices((prevDevices) =>
            prevDevices.map((device) =>
              device.deviceUUID === updatedDevice.deviceUUID ? { ...device, ...updatedDevice } : device
            )
          );
      }
      if (deviceInAccessControl) {
        setCompanyDevices((prevDevices) =>
          prevDevices.map((device) => {
            if (device.deviceUUID === updatedDevice.deviceUUID) {
              const updatedFields = {};
              Object.entries(updatedDevice.stateInfo).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                  updatedFields[key] = value;
                }
              });

              if (Object.keys(updatedFields).length > 0) {
                return {
                  ...device,
                  stateInfo: {
                    ...(device.stateInfo || {}),
                    ...updatedFields,
                  },
                };
              }
              return { ...device };
            }
            return device;
          })
        );
      }
    },
    [filteredSsmDevices, filteredAccessControlDevices]
  );

  useEffect(() => {
    if (!gStripe.customerInfo.companyID) {
      return;
    }
    getCompanyDevices();
    if (!gStripe.customerInfo.isSesameApp) {
      getUserDevices();
    }
  }, [gStripe.customerInfo.companyID]);

  const getWifiState = useCallback(
    (touchId) => {
      let result = false;

      // 检查 filteredAccessControlDevices 是否为有效数组
      if (!Array.isArray(filteredAccessControlDevices)) {
        console.error('filteredAccessControlDevices is not a valid array');
        return result;
      }

      // 查找匹配的设备
      const matchedDevice = filteredAccessControlDevices.find((item) => item.deviceUUID === touchId);

      // 检查 stateInfo 和 wm2State 是否存在
      if (matchedDevice && matchedDevice.stateInfo && matchedDevice.stateInfo.wm2State !== undefined) {
        result = matchedDevice.stateInfo.wm2State;
      } else {
        result = false;
      }

      if (!result) {
        setSnackbarValue({ open: true, msg: 'Hub3との通信状況をご確認ください' });
      }

      return result;
    },
    [filteredAccessControlDevices, setSnackbarValue]
  );

  const findTouchName = useCallback(
    (touchId) => {
      return filteredAccessControlDevices.find((item) => item.deviceUUID === touchId)?.deviceName ?? touchId;
    },
    [filteredAccessControlDevices]
  );

  const getUserDevices = useCallback(
    (forceFetch = false) => {
      let message = { action: ACTION_TYPES.BIZ3_MANAGE_DEVICE, op: 'getUserDevice' };
      forceFetch ? sendMessage(message) : handleSendMessage(message);
    },
    [handleSendMessage]
  );

  const getCompanyDevices = useCallback(
    (forceFetch = false) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      let message = { action: ACTION_TYPES.BIZ3_MANAGE_DEVICE, op: 'getCompanyDevice', companyID };
      forceFetch ? sendMessage(message) : handleSendMessage(message);
    },
    [handleSendMessage, gStripe.customerInfo.companyID]
  );

  const removeSesameDevices = useCallback(
    (items, cb, forceFetch = false) => {
      const companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      let message = { action: ACTION_TYPES.BIZ3_MANAGE_DEVICE, op: 'del', companyID, items };
      forceFetch ? sendMessage(message) : handleSendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [gStripe.customerInfo.companyID, handleSendMessage, registerCallback]
  );

  const updateDeviceName = useCallback(
    ({ subUUID, deviceUUID, deviceName }, cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE,
        obj: {
          subUUID,
          deviceUUID,
          deviceName,
        },
        op: 'updateName',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [registerCallback]
  );

  const addSesameDevicesToBiz3 = useCallback(
    (items, cb, isTouch = false) => {
      const message = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE,
        op: 'add',
        items,
        isTouchPro: isTouch,
        companyID: gStripe.customerInfo.companyID,
      };
      handleSendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [gStripe.customerInfo.companyID, handleSendMessage, registerCallback]
  );

  const reorderDevice = useCallback(
    (items, cb) => {
      items.forEach((item, index) => {
        item.rank = 0 - index;
      });
      const message = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE,
        op: 'reorderDevices',
        items,
        companyID: gStripe.customerInfo.companyID,
      };
      handleSendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [gStripe.customerInfo.companyID, handleSendMessage, registerCallback]
  );

  const getDevicesNotifyStatus = useCallback(
    ({ pushToken, items }, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE,
        companyID,
        pushToken,
        items,
        op: 'notifyList',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const switchDeviceNotify = useCallback(
    ({ pushToken, deviceUUID, enablePush }, cb) => {
      let companyID = gStripe.customerInfo.companyID;
      if (!companyID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE,
        companyID,
        enablePush,
        deviceUUID,
        pushToken,
        op: 'notifyManage',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [gStripe.customerInfo.companyID, registerCallback]
  );

  const subscribeDevicesUpdate = useCallback(
    (deviceInfos) => {
      const companyID = gStripe.customerInfo.companyID;
      const message = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE,
        op: 'subscribeDevicesUpdate',
        items: deviceInfos,
        companyID: companyID,
      };
      handleSendMessage(message);
    },
    [handleSendMessage, gStripe]
  );

  const subscribeDevices = useCallback(
    (companyDevices) => {
      if (!companyDevices || companyDevices.length === 0) {
        return;
      }
      const deviceInfos = companyDevices
        .filter((device) => !gUtils.isWifiModel(device.deviceModel))
        .map((device) => ({
          deviceUUID: device.deviceUUID,
          deviceModel: device.deviceModel,
        }));
      if (deviceInfos.length > 0) {
        subscribeDevicesUpdate(deviceInfos);
      }
    },
    [subscribeDevicesUpdate]
  );

  const switchRechargebleBattery = useCallback(
    ({ deviceUUID, isRechargeBattery }, cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_MANAGE_DEVICE,
        deviceUUID,
        isRechargeBattery: isRechargeBattery ? 1 : 0,
        op: 'switchRecharge',
      };
      sendMessage(messageData);
      registerCallback(messageData.action, messageData.op, cb);
    },
    [registerCallback]
  );
  return {
    companyDevices,
    getCompanyDevices,
    filteredAccessControlDevices,
    setFilteredAccessControlDevices,
    userDevices,
    getUserDevices,
    canChoosedAccessControlDevices,
    canChoosedSsmDevices,
    removeSesameDevices, //移除设备
    addSesameDevicesToBiz3, //添加锁
    filteredSsmDevices, //ssm设备
    getWifiState,
    findTouchName,
    updateDeviceName,
    updateDeviceState,
    setCompanyDevices,
    reorderDevice,
    getDevicesNotifyStatus,
    switchDeviceNotify,
    switchRechargebleBattery,
  };
};
