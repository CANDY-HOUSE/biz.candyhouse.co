import { useCallback } from 'react';
import { useWebSocket, sendMessage } from './useWebSocket.ts';
import { ACTION_TYPES } from '@constants/messageConstants.js';
import { getIotCallbacks } from './useIotCallbackRegistry.js';
const useOperateIoT = () => {
  const iotReceive = (message) => {
    console.log({ '【iotReceive】': message });
    let op = message.op;
    let uuid;
    if (message.UUID === undefined && message.touch_id === undefined) {
      uuid = '';
    } else {
      if (message.UUID) {
        uuid = message.UUID;
      } else if (message.touch_id) {
        uuid = message.touch_id;
      }
    }
    const callback = getIotCallbacks(op);
    console.log({ '【callback】': callback });

    if (callback) {
      // 检查 uuid 是否为有效值
      const isValidUuid = uuid != null && uuid !== '';

      try {
        if (isValidUuid) {
          if (message.data) {
            callback(uuid, message.data); // 传递 uuid 和 message 数据
          } else {
            callback(uuid, message); // 传递 uuid 数据
          }
        } else {
          callback('', message); // 仅传递 message 数据
        }
      } catch (error) {
        console.error(`回调函数执行失败: ${error.message}`);
      }
    } else {
      // 改进日志信息，包含 op 的具体值
      console.log(`没有回调函数: 操作名称为 "${op}"`);
    }
  };

  const handleSendMessage = (message) => {
    sendMessage(message);
  };
  const handleBiz3OperateIoTResponse = useCallback((message) => {
    if (message.action === ACTION_TYPES.BIZ3_OPERATE_IOT) {
      iotReceive(message);
    }
  });
  useWebSocket(ACTION_TYPES.BIZ3_OPERATE_IOT, handleBiz3OperateIoTResponse);
  const sendCmd = async (cmd) => {
    console.log('sendCmd', cmd);
    let message = {
      action: ACTION_TYPES.BIZ3_OPERATE_IOT,
      ...cmd,
    };
    handleSendMessage(message);
  };

  return {
    sendCmd,
  };
};

export default useOperateIoT;
