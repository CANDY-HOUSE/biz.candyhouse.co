import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import { ACTION_TYPES } from '@constants/messageConstants';
import { useCallbacks } from '../hooks/useCallbacks.js';
import { registerIotCallback, unregisterIotCallback } from '@hooks/useIotCallbackRegistry';
import { biz3utils } from '@/utils/biz3utils.js';
import useOperateIoT from '@hooks/useOperateIoT.js';
import { gConfig } from '@constants/gConfig.js';
import { Buffer } from 'buffer';
import { debounce } from 'lodash';

const PubedCardLinkedDeviceIDs = 'pubCardLinkedIDs';
const PubedPasscodeLinkedDeviceIDs = 'pubPasscodeLinkedIDs';
const AuthDataOpType = {
  getCards: 'getCards',
  getPasscodes: 'getPasscodes',
  getCardsByStpDevice: 'getCardsByStpDevice',
};
export const useManageAuthData = (gManageDevice, gStripe) => {
  const [deviceCards, setDeviceCards] = useState({});
  const [devicePasscodes, setDevicePasscodes] = useState({});
  const { sendCmd } = useOperateIoT();
  const { registerCallback, invokeCallbacks } = useCallbacks();
  const [nfcCardFetchState, setNfcCardFetchState] = useState({ start: false, done: false });
  const [passcodeFetchState, setPasscodeFetchState] = useState({ start: false, done: false });

  const accessControlDevicesCount = useMemo(
    () => gManageDevice.filteredAccessControlDevices.length,
    [gManageDevice.filteredAccessControlDevices]
  );

  const refreshAuthData = useCallback(() => {
    const validDeviceUUIDs = gManageDevice.filteredAccessControlDevices.map((it) => it.deviceUUID);
    setDeviceCards((prevDeviceCards) => {
      return Object.fromEntries(
        Object.entries(prevDeviceCards).filter(([deviceUUID]) => validDeviceUUIDs.includes(deviceUUID))
      );
    });
    setDevicePasscodes((prevDeviceCards) => {
      return Object.fromEntries(
        Object.entries(prevDeviceCards).filter(([deviceUUID]) => validDeviceUUIDs.includes(deviceUUID))
      );
    });
  }, [gManageDevice.filteredAccessControlDevices]);

  useEffect(() => {
    setNfcCardFetchState({ start: false, done: false });
    setPasscodeFetchState({ start: false, done: false });
  }, [gStripe.customerInfo.companyID]);

  const getAuthenticationData = useCallback(({ op, devices = [] }) => {
    if (!devices.length) {
      return;
    }
    let deviceIds = devices.map((item) => item.deviceUUID).join(',');
    let message = {
      action: ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA,
      obj: {
        devices: deviceIds,
      },
      op,
    };
    sendMessage(message);
  }, []);

  const fetchNfcCards = useCallback(
    (deviceIds = []) => {
      if (deviceIds.length > 0) {
        getAuthenticationData({
          op: AuthDataOpType.getCards,
          devices: deviceIds.map((deviceUUID) => ({ deviceUUID })),
        });
        return;
      }
      const devices = gManageDevice.filteredAccessControlDevices;
      if (nfcCardFetchState.start) return;
      setNfcCardFetchState({ start: true, done: false });
      getAuthenticationData({ op: AuthDataOpType.getCards, devices });
    },
    [gManageDevice.filteredAccessControlDevices, nfcCardFetchState, getAuthenticationData]
  );

  const fetchPasscodes = useCallback(
    (deviceIds = []) => {
      if (deviceIds.length > 0) {
        getAuthenticationData({
          op: AuthDataOpType.getPasscodes,
          devices: deviceIds.map((deviceUUID) => ({ deviceUUID })),
        });
        return;
      }
      const devices = gManageDevice.filteredAccessControlDevices;
      if (passcodeFetchState.start) return;
      setPasscodeFetchState({ start: true, done: false });
      getAuthenticationData({ op: AuthDataOpType.getPasscodes, devices });
    },
    [gManageDevice.filteredAccessControlDevices, passcodeFetchState, getAuthenticationData]
  );

  useEffect(() => {
    // 数量变化时，清理对应数据
    if (gStripe.isFromApp) {
      return;
    }
    refreshAuthData();
    if (nfcCardFetchState.done || passcodeFetchState.done) {
      const devices = gManageDevice.filteredAccessControlDevices;
      if (nfcCardFetchState.done) {
        getAuthenticationData({ op: AuthDataOpType.getCards, devices });
      }
      if (passcodeFetchState.done) {
        getAuthenticationData({ op: AuthDataOpType.getPasscodes, devices });
      }
    }
  }, [accessControlDevicesCount]);

  const handleDeviceCardData = useCallback((data, op) => {
    const { deviceUUID, page, list = [] } = data;
    const stateMap = {
      [PubedCardLinkedDeviceIDs]: setDeviceCards,
      [PubedPasscodeLinkedDeviceIDs]: setDevicePasscodes,
    };
    const setStateFunction = stateMap[op];
    if (!setStateFunction) return;
    setStateFunction((prevState) => {
      const currentItems = prevState[deviceUUID] || [];
      const newItemsList = page === 1 ? [...list] : [...currentItems, ...list];
      return {
        ...prevState,
        [deviceUUID]: newItemsList,
      };
    });
  }, []);

  const passcodes = useMemo(() => {
    const { cardIDMap, cards } = Object.entries(devicePasscodes).reduce(
      (result, [deviceUUID, deviceCards]) => {
        deviceCards.forEach((card) => {
          const { passwordID } = card;
          if (!result.cardIDMap[passwordID]) {
            result.cardIDMap[passwordID] = new Set();
          }
          result.cardIDMap[passwordID].add(deviceUUID);
          result.cards.push(card);
        });
        return result;
      },
      { cardIDMap: {}, cards: [] }
    );
    return cards.map((card) => ({
      ...card,
      uuids: Array.from(cardIDMap[card.passwordID]),
    }));
  }, [devicePasscodes]);

  const nfcCards = useMemo(() => {
    const { cardIDMap, cards } = Object.entries(deviceCards).reduce(
      (result, [deviceUUID, deviceCards]) => {
        deviceCards.forEach((card) => {
          const { cardID } = card;
          if (!result.cardIDMap[cardID]) {
            result.cardIDMap[cardID] = new Set();
          }
          result.cardIDMap[cardID].add(deviceUUID);
          result.cards.push(card);
        });
        return result;
      },
      { cardIDMap: {}, cards: [] }
    );
    return cards.map((card) => ({
      ...card,
      uuids: Array.from(cardIDMap[card.cardID]),
    }));
  }, [deviceCards]);

  const handleAuthDataResponse = useCallback(
    (message) => {
      if (message.action !== ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA) return;
      switch (message.op) {
        case AuthDataOpType.getPasscodes:
          setPasscodeFetchState((prev) => ({ ...prev, done: true }));
          break;
        case AuthDataOpType.getCards:
          setNfcCardFetchState((prev) => ({ ...prev, done: true }));
          break;
        case AuthDataOpType.getCardsByStpDevice:
          invokeCallbacks(message);
          break;
        case PubedCardLinkedDeviceIDs:
          handleDeviceCardData(message.data, PubedCardLinkedDeviceIDs);
          break;
        case PubedPasscodeLinkedDeviceIDs:
          handleDeviceCardData(message.data, PubedPasscodeLinkedDeviceIDs);
          break;
        case 'updateCardName':
        case 'updatePasscodeName':
          const stateMap = {
            updateCardName: {
              listIdKey: 'cardID',
              contextIdKey: 'cardID',
              nameUUIDKey: 'cardNameUUID',
              function: setDeviceCards,
            },
            updatePasscodeName: {
              listIdKey: 'passwordID',
              contextIdKey: 'keyBoardPassCode',
              nameUUIDKey: 'keyBoardPassCodeNameUUID',
              function: setDevicePasscodes,
            },
          };
          invokeCallbacks(message);
          const { function: updateFunction, listIdKey, contextIdKey, nameUUIDKey } = stateMap[message.op] || {};
          const { name, stpDeviceUUID } = message.reqContext;
          updateFunction((prevDeviceCards) => {
            if (!prevDeviceCards[stpDeviceUUID]) {
              console.warn(`Device ${stpDeviceUUID} not found or has no cards`);
              return prevDeviceCards;
            }
            const cards = prevDeviceCards[stpDeviceUUID];
            const cardIndex = cards.findIndex((card) => card[listIdKey] === message.reqContext[contextIdKey]);
            if (cardIndex === -1) {
              return prevDeviceCards;
            }
            const updatedCards = [...cards];
            updatedCards[cardIndex] = {
              ...updatedCards[cardIndex],
            };
            if (name !== undefined) {
              updatedCards[cardIndex].name = name;
            }
            updatedCards[cardIndex].nameUUID = message.reqContext[nameUUIDKey];
            return {
              ...prevDeviceCards,
              [stpDeviceUUID]: updatedCards,
            };
          });
          break;
        case 'updateCardOwner':
          invokeCallbacks(message);
          const { cardID, ownerSubUUID } = message.reqContext;
          if ('ownerSubUUID' in message.reqContext) {
            setDeviceCards((prevDeviceCards) => {
              const updatedDeviceCards = { ...prevDeviceCards };
              for (const deviceUUID in updatedDeviceCards) {
                const cards = updatedDeviceCards[deviceUUID];
                const updatedCards = cards.map((card) => {
                  if (cardID === card.cardID) {
                    return {
                      ...card,
                      subUUID: ownerSubUUID,
                    };
                  } else {
                    return card;
                  }
                });
                updatedDeviceCards[deviceUUID] = updatedCards;
              }
              return updatedDeviceCards;
            });
            return;
          }
          break;
        case 'postCards':
        case 'postPasscodes':
          invokeCallbacks(message);
          // fetchNfcCards();
          break;
        case 'delCards':
          // fetchNfcCards();
          break;
        case 'clearCards':
        case 'clearPasscodes':
          invokeCallbacks(message);
          break;
        default:
          break;
      }
    },
    [handleDeviceCardData, invokeCallbacks]
  );

  const findCardsByCardID = useCallback(
    (cardID) => {
      return nfcCards.filter((item) => item.cardID === cardID) || [];
    },
    [nfcCards]
  );

  const findPasscodesByPasscodeID = useCallback(
    (cardID) => {
      return passcodes.filter((item) => item.passwordID === cardID) || [];
    },
    [passcodes]
  );

  useWebSocket(ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA, handleAuthDataResponse);

  const clearCards = useCallback(
    (deviceUUID, cb) => {
      if (!deviceUUID) {
        return;
      }
      let message = {
        action: ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA,
        obj: {
          devices: deviceUUID,
        },
        op: 'clearCards',
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback]
  );

  const clearPasswords = useCallback(
    (deviceUUID, cb) => {
      if (!deviceUUID) {
        return;
      }
      let message = {
        action: ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA,
        obj: {
          devices: deviceUUID,
        },
        op: 'clearPasscodes',
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback]
  );

  const handlePutCardName = useCallback(
    (op, item, cb) => {
      let message = {
        action: ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA,
        obj: {
          ...item,
        },
        op,
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback]
  );

  const updateCardOwner = useCallback(
    (item, cb) => {
      if ('ownerSubUUID' in item) {
        handlePutCardName('updateCardOwner', item, cb);
      }
    },
    [handlePutCardName]
  );

  const deleteCards = useCallback(async (items) => {
    if (!items || !items.length) {
      return;
    }
    let message = {
      action: ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA,
      items,
      op: 'delCards',
    };
    sendMessage(message);
  }, []);

  const deletePasscodes = useCallback((items) => {
    if (!items || !items.length) {
      return;
    }
    let message = {
      action: ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA,
      items,
      op: 'delPasscodes',
    };
    sendMessage(message);
  }, []);

  const postCards = useCallback(
    ({ deviceUUID, list, cb }) => {
      if (list.length < 1) {
        return;
      }
      let message = {
        action: ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA,
        deviceUUID,
        list,
        op: 'postCards',
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback]
  );

  const postPasscodes = useCallback(
    ({ deviceUUID, list, cb }) => {
      if (list.length < 1) {
        return;
      }
      let message = {
        action: ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA,
        deviceUUID,
        list,
        op: 'postPasscodes',
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback]
  );

  // 配置对象
  const UPDATE_CONFIGS = {
    card: {
      opType: 'updateCardName',
      idKey: 'cardID',
      uuidKey: 'cardNameUUID',
      cmdCode: gConfig.cmdCode.SSM_OS3_CARD_CHANGE,
      newUuidKey: 'cardNameUUID',
    },
    password: {
      opType: 'updatePasscodeName',
      idKey: 'keyBoardPassCode',
      uuidKey: 'keyBoardPassCodeNameUUID',
      cmdCode: gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE,
      newUuidKey: 'keyBoardPassCodeNameUUID',
    },
  };

  const updateItemName = useCallback(
    (config, item, cb) => {
      const { opType, idKey, uuidKey, cmdCode, newUuidKey } = config;
      const { stpDeviceUUID } = item;
      const id = item[idKey];
      const uuidValue = item[uuidKey];

      if (biz3utils.isUUIDV4(uuidValue)) {
        handlePutCardName(opType, item, cb);
      } else {
        // 不是 uuid 格式，调用 hub3-蓝牙 修改为该格式，同 App 逻辑
        let idBuff = biz3utils.hexStringToUint8Array(id);
        let uuid = window.crypto.randomUUID();
        let nameUUIDBuff = biz3utils.hexStringToUint8Array(uuid.replace(/-/g, ''));
        let payloadSize = 1 + 1 + idBuff.length + nameUUIDBuff.length;
        let payloadU8A = new Uint8Array(payloadSize);
        payloadU8A[0] = cmdCode;
        payloadU8A[1] = idBuff.length;
        payloadU8A.set(idBuff, 2);
        payloadU8A.set(nameUUIDBuff, 2 + idBuff.length);
        let payload = Buffer.from(payloadU8A).toString('base64');
        const timeoutId = setTimeout(() => {
          unregisterIotCallback(cmdCode);
          cb({ errMsg: '認証機器とHub3の接続を確認してください。' });
        }, 15000);
        registerIotCallback(cmdCode, async (deviceUUID, _data) => {
          if (deviceUUID !== stpDeviceUUID) return;
          clearTimeout(timeoutId);
          const senParam = {
            ...item,
            [newUuidKey]: uuid,
          };
          handlePutCardName(opType, senParam, cb);
          unregisterIotCallback(cmdCode);
        });
        sendCmd({
          topic: `stp${stpDeviceUUID}cmd`,
          payload,
          op: cmdCode,
        });
      }
    },
    [handlePutCardName, sendCmd]
  );

  const updateCardName = useCallback((item, cb) => updateItemName(UPDATE_CONFIGS.card, item, cb), [updateItemName]);
  const updatePasswordName = useCallback(
    (item, cb) => updateItemName(UPDATE_CONFIGS.password, item, cb),
    [updateItemName]
  );

  const debouncedFetchNfcCards = debounce(
    (deviceUUID) => {
      fetchNfcCards([deviceUUID]);
    },
    1500,
    {
      leading: false, // 不在延迟开始前执行
      trailing: true, // 在延迟结束后执行
      maxWait: 3000, // 最大等待时间为3秒
    }
  );

  const debouncedFetchPasscodes = debounce(
    (deviceUUID) => {
      fetchPasscodes([deviceUUID]);
    },
    1500,
    {
      leading: false, // 不在延迟开始前执行
      trailing: true, // 在延迟结束后执行
      maxWait: 3000, // 最大等待时间为3秒
    }
  );

  registerIotCallback(gConfig.cmdCode.SSM_OS3_CARD_NOTIFY, (deviceUUID, data) => {
    debouncedFetchNfcCards([data.stpUUID]);
  });
  registerIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_NOTIFY, (deviceUUID, data) => {
    debouncedFetchPasscodes([data.stpUUID]);
  });
  registerIotCallback(gConfig.cmdCode.STP_ITEM_CODE_PASSCODES_DELETE, (deviceUUID, data) => {
    const payload = data.reqContext.payload;
    const topic = data.reqContext.topic;
    const deviceID = topic.substring(3, topic.length - 3);
    const passcodeIds = biz3utils.extractCardIDsFromBase64(payload);
    const items = passcodeIds.map((passwordID) => {
      return {
        deviceID,
        passwordID,
      };
    });
    deletePasscodes(items);
  });
  registerIotCallback(gConfig.cmdCode.SSM2_ITEM_CODE_MECH_STATUS, (deviceUUID, data) => {
    console.log('updateMechStatus', deviceUUID, data);
    // 在 companyDevices 里找到对应的设备， 更新设备状态
    // 创建新数组，避免直接修改原始数组
    const updatedCompanyDevices = gManageDevice.companyDevices.map((device) => {
      if (device.deviceUUID === deviceUUID) {
        // 如果卡片数量发生变化，重新获取卡片列表
        if (device.stateInfo?.cards_num !== data.cards_num) {
          debouncedFetchNfcCards([device.deviceUUID]);
        }
        if (device.stateInfo?.keyboards_num !== data.keyboards_num) {
          debouncedFetchPasscodes([device.deviceUUID]);
        }
        return {
          ...device,
          stateInfo: {
            ...device.stateInfo,
            wm2State: data.wifi_state,
            cards_num: data.cards_num,
            fingerprints_num: data.fingerprints_num,
            keyboards_num: data.keyboards_num,
          },
        };
      }
      return device;
    });
    // 更新状态，触发组件重新渲染
    gManageDevice.setCompanyDevices(updatedCompanyDevices);
  });

  const buildPaylodToFetch = useCallback((uuid, code) => {
    if (!uuid) {
      console.log('buildPaylodToFetch uuid is empty');
      return;
    }
    // 声明一个空的 Uint8Array
    let payload = new Uint8Array(1);
    // 在 payload 中添加一个字节
    payload[0] = code;
    console.log('[cards][payload]', payload);
    // base64 编码
    let base64 = Buffer.from(payload).toString('base64');
    // 发送命令
    let cmd = {
      topic: `stp${uuid}cmd`,
      payload: base64,
      op: code,
    };
    console.log('[cards][message]', cmd);
    return cmd;
  }, []);

  //获取所有卡片
  const getAllCards = useCallback(
    async (uuid) => {
      console.log('获取所有卡片', uuid);
      await sendCmd(buildPaylodToFetch(uuid, gConfig.cmdCode.SSM_OS3_CARD_GET));
    },
    [buildPaylodToFetch, sendCmd]
  );

  const getAllPasscodes = useCallback(
    async (uuid) => {
      console.log('获取所有密码', uuid);
      await sendCmd(buildPaylodToFetch(uuid, gConfig.cmdCode.SSM_OS3_PASSCODE_GET));
    },
    [buildPaylodToFetch, sendCmd]
  );

  // 根据卡片计算 卡片ID 数据 的大小
  const getCardsDataSize = useCallback((items) => {
    return items.reduce((acc, item) => {
      let cardID = item.cardID.replace(/-/g, ''); // 去掉卡片ID中的分隔符
      console.log('[cardID]', cardID);
      let cardIDArray = biz3utils.hexStringToUint8Array(cardID); // 16进制字符串转换为Uint8Array
      console.log('[cardIDArray]', cardIDArray);
      let cardIdLen = cardIDArray.length;
      return acc + cardIdLen + 1;
    }, 0);
  }, []);

  const getPasswordsDataSize = useCallback((items) => {
    return items.reduce((acc, item) => {
      let passwordIDArray = biz3utils.hexStringToUint8Array(item.passwordID); // 假设 passwordID 是一个 16 进制字符串
      let passwordIdLen = passwordIDArray.length;
      return acc + passwordIdLen + 1;
    }, 0);
  }, []);

  const sendDelCardsCmd = useCallback(
    async (uuid, items) => {
      console.log('删除卡片', uuid, items);
      if (!Array.isArray(items) || items.length === 0) {
        console.log('No items to process');
        return;
      }
      if (!uuid) {
        return;
      }
      return new Promise((resolve, _reject) => {
        const deleteCallback = async (_deviceUUID, data) => {
          const payload = data.reqContext.payload;
          const topic = data.reqContext.topic;
          const deviceID = topic.substring(3, topic.length - 3);
          const cardIds = biz3utils.extractCardIDsFromBase64(payload);
          const deleteItems = cardIds.map((item) => {
            return {
              deviceID: deviceID,
              cardID: item,
            };
          });
          try {
            await deleteCards(deleteItems);
            unregisterIotCallback(gConfig.cmdCode.STP_ITEM_CODE_CARDS_DELETE);
            resolve();
          } catch (error) {
            console.log('deleteCallback error', error);
            resolve();
          }
        };
        registerIotCallback(gConfig.cmdCode.STP_ITEM_CODE_CARDS_DELETE, deleteCallback);
        // 发送指令
        let cardsDataSize = getCardsDataSize(items);
        let payload = new Uint8Array(1 + cardsDataSize);
        payload[0] = gConfig.cmdCode.STP_ITEM_CODE_CARDS_DELETE;
        let offset = 1;
        for (let i = 0; i < items.length; i++) {
          let cardID = items[i].cardID.replace(/-/g, '');
          let cardIDArray = biz3utils.hexStringToUint8Array(cardID);
          let cardIdLen = cardIDArray.length;
          payload[offset] = cardIdLen;
          offset += 1;
          payload.set(cardIDArray, offset);
          offset += cardIDArray.length;
        }
        console.log('[sendDelCardsCmd][payload]', payload);
        let base64 = Buffer.from(payload).toString('base64');
        let cmd = {
          topic: `stp${uuid}cmd`,
          payload: base64,
          op: gConfig.cmdCode.STP_ITEM_CODE_CARDS_DELETE,
        };
        sendCmd(cmd);
      });
    },
    [deleteCards, getCardsDataSize, sendCmd]
  );

  const sendDelPasswordsCmd = useCallback(
    async (uuid, items) => {
      console.log('删除密码', uuid, items);
      if (!Array.isArray(items) || items.length === 0) {
        console.log('No items to process');
        return;
      }
      if (!uuid) {
        return;
      }
      let passwordsDataSize = getPasswordsDataSize(items);
      console.log('[passwordsDataSize]', passwordsDataSize);
      let payload = new Uint8Array(1 + passwordsDataSize);
      payload[0] = gConfig.cmdCode.STP_ITEM_CODE_PASSCODES_DELETE;
      let offset = 1;
      for (let i = 0; i < items.length; i++) {
        let passwordIDArray = biz3utils.hexStringToUint8Array(items[i].passwordID);
        console.log('[passwordIDArray]', passwordIDArray);
        let passwordIDLen = passwordIDArray.length;
        payload[offset] = passwordIDLen;
        offset += 1;
        payload.set(passwordIDArray, offset);
        offset += passwordIDArray.length;
      }
      console.log('[sendDelPasswordsCmd][payload]', payload);
      let base64 = Buffer.from(payload).toString('base64');
      let cmd = {
        topic: `stp${uuid}cmd`,
        payload: base64,
        op: gConfig.cmdCode.STP_ITEM_CODE_PASSCODES_DELETE,
      };
      console.log('[sendDelPasswordsCmd][message]', cmd);
      await sendCmd(cmd);
    },
    [getPasswordsDataSize, sendCmd]
  );

  /**
   * 查询某台 stpDevice 上曾经用过的全部卡片。
   *
   * 与 getCards 的区别：getCards 只回传当前与设备关联的卡片（读 candyhouse_sesame_card，
   * 会被 clearCards / delCards 清掉）；这里按 nfc_card 表的 stpDeviceUUID 索引检索，
   * 那张表只写不删，所以能拿到设备上曾经登録过的卡片。
   *
   * 请求：{ action, op: 'getCardsByStpDevice', obj: { stpDeviceUUID, lastKey, pageSize } }
   * 响应：{ action, op: 'getCardsByStpDevice', data: { list, lastKey, total } }
   *
   * 后端已按 cardID 去重（同一张卡每次改名/登録都会新增一条记录），
   * lastKey 是去重后列表上的不透明游标，为空表示已取完。
   */
  const getCardsByStpDevice = useCallback(
    ({ stpDeviceUUID, lastKey = null, pageSize = 500 }, cb) => {
      if (!stpDeviceUUID) {
        console.log('getCardsByStpDevice stpDeviceUUID is empty');
        return;
      }
      let message = {
        action: ACTION_TYPES.BIZ3_MANAGE_AC_AUTHDATA,
        obj: {
          stpDeviceUUID,
          lastKey,
          pageSize,
        },
        op: AuthDataOpType.getCardsByStpDevice,
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback]
  );

  return {
    nfcCards,
    findCardsByCardID,
    getCardsByStpDevice,
    updateCardName,
    updateCardOwner,
    postCards,
    clearCards,
    fetchNfcCards,
    passcodes,
    postPasscodes,
    fetchPasscodes,
    clearPasswords,
    findPasscodesByPasscodeID,
    updatePasswordName,
    nfcCardFetchState,
    passcodeFetchState,

    sendDelCardsCmd,
    sendDelPasswordsCmd,
    getAllCards,
    getAllPasscodes,
  };
};
