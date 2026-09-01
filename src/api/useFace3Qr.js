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
 *     op: 'redeem'  本 hook 调用，把券兑成绑定关系
 *     op: 'list'    本 hook 调用，列出我绑过的设备
 *     op: 'wake'    本 hook 调用，唤醒设备去推流
 *     op: 'viewer'  本 hook 调用，取观看端临时凭证
 *     op: 'unbind'  本 hook 调用，解绑（把设备从我的列表移除）
 *
 * 刻意不在消息体里带 subUUID：云端从 face3_ws_connections[connectionId]
 * 取当前登录用户，请求体里报什么都不作数。这样"我是谁"由已鉴权的连接决定，
 * 前端改不动，也就没法替别人绑设备。
 */
const useFace3Qr = () => {
  const [binding, setBinding] = useState(null);
  const [face3Devices, setFace3Devices] = useState([]);
  const [face3DevicesLoaded, setFace3DevicesLoaded] = useState(false);
  const { registerCallback, invokeCallbacks } = useCallbacks();

  /**
   * 兑换一张券。
   * @param {string} qrUUID 从二维码里解出的券号（小写带横线）
   * @param {Function} cb   回调，收到 {success, code, message, data}
   * @param {string} [cognitoIdentityId] 真实的 Cognito 身份，仅作记录用，不作主体
   */
  const redeemQr = useCallback(
    (qrUUID, cb, cognitoIdentityId) => {
      if (!qrUUID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_FACE3_QR,
        op: 'redeem',
        qrUUID,
      };
      /* 真实的 Cognito Identity ID，由原生 App 挂在 URL 的 cid 上带进来。
       *
       * 它**不是**主体：谁在绑定仍由已鉴权的连接决定（云端从连接记录取）。
       * 这里带上只是为了让绑定关系里存一个能在身份池里反查到的值 ——
       * 主体键用的那个 "ap-northeast-1:" + ANDROID_ID 长得像 Cognito ID，
       * 实际在池里查不到（见 doc/face3-app-identity-fix.md）。
       *
       * 云端会校验格式并确认它确实存在于身份池，不合格就当没带。 */
      if (cognitoIdentityId) {
        messageData.cognitoIdentityId = cognitoIdentityId;
      }
      sendMessage(messageData);
      registerCallback(ACTION_TYPES.BIZ3_FACE3_QR, messageData.op, cb);
    },
    [registerCallback]
  );

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
   * @param {string} deviceId 设备编号
   * @param {Function} cb     回调，收到 {success, code, message, data}
   */
  const wakeFace3Device = useCallback(
    (deviceId, cb) => {
      if (!deviceId) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_FACE3_QR,
        op: 'wake',
        deviceId,
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
   * @param {string} deviceId
   * @param {Function} cb 回调，收到 {success, code, message, data}
   */
  const viewFace3Device = useCallback(
    (deviceId, cb) => {
      if (!deviceId) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_FACE3_QR,
        op: 'viewer',
        deviceId,
      };
      sendMessage(messageData);
      registerCallback(ACTION_TYPES.BIZ3_FACE3_QR, messageData.op, cb);
    },
    [registerCallback]
  );

  /**
   * 解绑一台设备：把它从"我"的绑定列表里移除。
   *
   * 只会解自己名下的绑定（云端按已鉴权连接的主体删除，键含主体），删不到别人的。
   * owner 解绑也只移除自己，不影响其他已绑用户。撤权即时生效：解绑后对这台设备
   * 的唤醒/观看都会被云端拒绝。
   *
   * @param {string} deviceId
   * @param {Function} cb 回调，收到 {success, code, message, data:{deviceId, unbound}}
   */
  const unbindFace3Device = useCallback(
    (deviceId, cb) => {
      if (!deviceId) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_FACE3_QR,
        op: 'unbind',
        deviceId,
      };
      sendMessage(messageData);
      registerCallback(ACTION_TYPES.BIZ3_FACE3_QR, messageData.op, cb);
    },
    [registerCallback]
  );

  const handleFace3QrResponse = useCallback(
    (message) => {
      invokeCallbacks(message);
      switch (message.action) {
        case ACTION_TYPES.BIZ3_FACE3_QR:
          switch (message.op) {
            case 'redeem':
              if (message.success) setBinding(message.data);
              break;
            case 'list':
              /* 失败时不要把已有列表清空 —— 断网重连的瞬间会拿到一次失败，
                 清空会让页面闪一下空状态。保留旧数据，交给调用方处理错误。 */
              if (message.success) {
                setFace3Devices(message.data?.devices || []);
                setFace3DevicesLoaded(true);
              }
              break;
            case 'unbind':
              /* 解绑成功就把这台设备从本地列表摘掉，列表立即刷新，不必再拉一次 list。 */
              if (message.success && message.data?.deviceId) {
                setFace3Devices((prev) => prev.filter((d) => d.deviceId !== message.data.deviceId));
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

  useWebSocket(ACTION_TYPES.BIZ3_FACE3_QR, handleFace3QrResponse);

  return {
    binding,
    setBinding,
    redeemQr,
    face3Devices,
    face3DevicesLoaded,
    listFace3Devices,
    wakeFace3Device,
    viewFace3Device,
    unbindFace3Device,
  };
};

export default useFace3Qr;
