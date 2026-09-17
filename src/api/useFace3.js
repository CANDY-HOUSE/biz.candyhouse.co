import { ACTION_TYPES } from '@constants/messageConstants';
import { sendMessage, useWebSocket } from '@hooks/useWebSocket.ts';
import { useCallback, useState } from 'react';
import { useCallbacks } from '../hooks/useCallbacks.js';

/**
 * Face3 设备二维码绑定。
 *
 * 走的是与设备取码同一条 WebSocket 路由 biz3Face3Qr（云端函数 Face3_qr），
 * 靠 op 区分两端：
 *
 *     op: 'issue'   设备侧调用，签发一张券        —— 手机不会用到
 *     op: 'list'    本 hook 调用，列出我绑过的设备
 *     op: 'wake'    本 hook 调用，唤醒设备去推流
 *     op: 'viewer'  本 hook 调用，取观看端临时凭证
 *
 * 刻意不在消息体里带 subUUID：云端从 face3_ws_connections[connectionId]
 * 取当前登录用户，请求体里报什么都不作数。这样"我是谁"由已鉴权的连接决定，
 * 前端改不动，也就没法替别人绑设备。
 */
const useFace3 = () => {
  const [face3Devices, setFace3Devices] = useState([]);
  const { registerCallback, invokeCallbacks } = useCallbacks();

  /**
   * 拉取当前登录用户绑定的 Face3 列表。
   * 同样不带 subUUID —— 云端从连接记录取，只会返回"我"的设备。
   */
  const listFace3Devices = useCallback(
    (cb) => {
      const messageData = {
        action: ACTION_TYPES.BIZ3_FACE3_QR,
        op: 'list',
      };
      sendMessage(messageData);
      registerCallback(ACTION_TYPES.BIZ3_FACE3_QR, messageData.op, cb);
    },
    [registerCallback]
  );

  /**
   * 唤醒一台设备去起 WebRTC 推流。
   *
   * 设备平时是断电休眠的（省电，靠 6629 的雷达唤醒），WiFi 模块的 WebSocket
   * 一直挂着。云端把 face3Wake 推给模块，模块负责给 T32 上电，等它起来再把
   * 这条补发过去。所以"发送成功"只代表命令递到了模块，画面还要等设备启动。
   *
   * 鉴权在云端做：只有绑过这台设备的人才能唤醒它，请求体里报什么都不作数。
   *
   * @param {string} deviceUUID 设备编号
   * @param {Function} cb     回调，收到 {success, code, message, data}
   */
  const wakeFace3Device = useCallback(
    (deviceUUID, cb) => {
      if (!deviceUUID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_FACE3_QR,
        op: 'wake',
        deviceId: deviceUUID,
      };
      sendMessage(messageData);
      registerCallback(ACTION_TYPES.BIZ3_FACE3_QR, messageData.op, cb);
    },
    [registerCallback]
  );

  /**
   * 取一台设备的观看端凭证。
   *
   * 云端校验绑定关系后，AssumeRole 签发一组**只能连这一个频道**的临时凭证
   * （15 分钟），连同频道 ARN 和 ICE 服务器一起返回。浏览器里不放长期凭证，
   * 也不需要给 Cognito 未认证角色开 KVS 权限。
   *
   * 先决条件：设备得先被唤醒并把流推上来，否则频道存在但没人发画面。
   * 频道尚未创建时云端回 channel_not_ready。
   *
   * @param {string} deviceUUID
   * @param {Function} cb 回调，收到 {success, code, message, data}
   */
  const viewFace3Device = useCallback(
    (deviceUUID, cb) => {
      if (!deviceUUID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_FACE3_QR,
        op: 'viewer',
        deviceId: deviceUUID,
      };
      sendMessage(messageData);
      registerCallback(ACTION_TYPES.BIZ3_FACE3_QR, messageData.op, cb);
    },
    [registerCallback]
  );

  const handleFace3Response = useCallback(
    (message) => {
      invokeCallbacks(message);
      switch (message.action) {
        case ACTION_TYPES.BIZ3_FACE3_QR:
          switch (message.op) {
            case 'list':
              /* 失败时不要把已有列表清空 —— 断网重连的瞬间会拿到一次失败，
                 清空会让页面闪一下空状态。保留旧数据，交给调用方处理错误。 */
              if (message.success) {
                setFace3Devices(message.data?.devices || []);
              }
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    },
    [invokeCallbacks]
  );

  useWebSocket(ACTION_TYPES.BIZ3_FACE3_QR, handleFace3Response);

  return {
    face3Devices,
    listFace3Devices,
    wakeFace3Device,
    viewFace3Device,
  };
};

export default useFace3;
