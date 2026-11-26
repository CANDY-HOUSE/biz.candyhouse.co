import { ACTION_TYPES } from '@constants/messageConstants';
import { sendMessage, useWebSocket } from '@hooks/useWebSocket.ts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createEventRecordingRequests } from '../utils/eventRecordingRequests';
import { useCallbacks } from '../hooks/useCallbacks.js';

/**
 * Face3 设备二维码绑定。
 *
 * 走的是与设备取码同一条 WebSocket 路由 biz3Face3Qr（云端函数 Face3_qr），
 * 靠 op 区分两端：
 *
 *     op: 'issue'    设备侧调用，签发一张券        —— 手机不会用到
 *     op: 'wake'     本 hook 调用，唤醒设备开始推流（云端下发给设备的 action 为 face3Wake）
 *     op: 'viewer'   本 hook 调用，按 mode 取观看端凭证（KVS 临时凭证 / LiveKit token）
 *     op: 'aiSession' 启动、查询或停止设备的共享 AI 会话
 *
 * 刻意不在消息体里带 subUUID：云端从 face3_ws_connections[connectionId]
 * 取当前登录用户，请求体里报什么都不作数。这样"我是谁"由已鉴权的连接决定，
 * 前端改不动，也就没法替别人绑设备。
 *
 * Face3 设备列表不在这里：随公司设备列表（biz3ManageDevice getCompanyDevice）返回，
 * 由 face3Context 按机型 sesame_face_3 筛出（原 op:'list' 已去掉）。
 */
const useFace3 = () => {
  const [face3StreamStates, setFace3StreamStates] = useState({});
  /* 设备上报 streamState 时附带的原因（如 stopped 的 "doorbell" = 门铃挂断）。
     与 face3StreamStates 分开存，不改变后者的取值形态。 */
  const [face3StreamReasons, setFace3StreamReasons] = useState({});
  const { registerCallback, invokeCallbacks } = useCallbacks();

  const recordingRequests = useRef(null);
  if (!recordingRequests.current) {
    recordingRequests.current = createEventRecordingRequests(
      (message) => sendMessage(message, false),
      ACTION_TYPES.BIZ3_FACE3_QR
    );
  }
  useEffect(() => () => recordingRequests.current.dispose(), []);
  const listFace3Recordings = useCallback(
    (deviceUUID, { before, limit = 30, signal } = {}) =>
      recordingRequests.current.request(
        'eventRecList',
        {
          deviceId: deviceUUID.toUpperCase(),
          ...(before ? { before } : {}),
          limit,
        },
        signal
      ),
    []
  );
  const playFace3Recording = useCallback(
    (deviceUUID, recId, signal) =>
      recordingRequests.current.request('eventRecPlay', { deviceId: deviceUUID.toUpperCase(), recId }, signal),
    []
  );
  /**
   * 文字合成语音（云端 Polly），用来在实时画面里"打字说话"。
   * 只有绑过这台设备的人能用；回 { success, data: { audio: MP3 的 base64, gender: 实际用的性别 } }。
   * lang 传界面语言，gender 传 'female' | 'male'（不传为女声），云端按白名单选音色；没有男声的语言（普通话）用女声。
   */
  const synthesizeFace3Speech = useCallback(
    (deviceUUID, text, lang, gender, signal) =>
      recordingRequests.current.request('tts', { deviceId: deviceUUID.toUpperCase(), text, lang, gender }, signal),
    []
  );
  /** 删一段录像（云端记录和 S3 文件）。只有拥有者 / 管理员能删，访客回 no_permission。 */
  const deleteFace3Recording = useCallback(
    (deviceUUID, recId, signal) =>
      recordingRequests.current.request('eventRecDelete', { deviceId: deviceUUID.toUpperCase(), recId }, signal),
    []
  );

  /**
   * 识别成功时门铃屏幕播放的视频（Face3_qr op:welcomeVid*）。welcomeVid 是视频 id（S3 上的 UUID），
   * defaultVid 是默认那个（= 固件出厂内置的那段），没选过时当前选择就是它。
   * 只有绑过这台设备的人能查；保存另要拥有者 / 管理员，访客回 no_permission。
   * Get 回 { welcomeVid, defaultVid, canEdit, item }（item 为当前那项）；
   * List 分页（默认那个排第一，其余按上传顺序），cursor 传上一页的 nextCursor，
   * 每项 { welcomeVid, name, desc, preview, poster }，name / desc 按语言（ja / en / zh-CN / zh-TW），
   * preview / poster 是 1 小时有效的地址；
   * Set 保存后，门铃下次开机联网时自己同步（选默认就回到内置，选别的就下载替换）。
   */
  const getFace3WelcomeVid = useCallback(
    (deviceUUID, signal) =>
      recordingRequests.current.request('welcomeVidGet', { deviceId: deviceUUID.toUpperCase() }, signal),
    []
  );
  const listFace3WelcomeVids = useCallback(
    (deviceUUID, { cursor, limit = 12, signal } = {}) =>
      recordingRequests.current.request(
        'welcomeVidList',
        { deviceId: deviceUUID.toUpperCase(), ...(cursor ? { cursor } : {}), limit },
        signal
      ),
    []
  );
  const setFace3WelcomeVid = useCallback(
    (deviceUUID, welcomeVid, signal) =>
      recordingRequests.current.request('welcomeVidSet', { deviceId: deviceUUID.toUpperCase(), welcomeVid }, signal),
    []
  );

  const requestAiSession = useCallback(
    (deviceId, operation, fields, signal) =>
      recordingRequests.current.request('aiSession', { deviceId, operation, ...fields }, signal, 'clientRequestId'),
    []
  );

  const wakeFace3ForAi = useCallback((deviceId, signal) => {
    setFace3StreamStates((states) => ({ ...states, [deviceId]: null }));
    return recordingRequests.current.request('wake', { deviceId }, signal);
  }, []);

  /**
   * 唤醒、取观看凭证这类请求只在连接可用时发送，不进断线队列：
   * 页面关掉后才重连补发，会把设备白白唤醒一次。断线时立即回调 ws_disconnected。
   */
  const sendWithoutQueue = useCallback(
    (messageData, callbackKey, cb) => {
      sendMessage(messageData, false).then(
        () => registerCallback(ACTION_TYPES.BIZ3_FACE3_QR, callbackKey, cb),
        () => cb?.({ success: false, message: 'ws_disconnected' })
      );
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
      setFace3StreamStates((states) => ({ ...states, [deviceUUID]: null }));
      const messageData = {
        action: ACTION_TYPES.BIZ3_FACE3_QR,
        op: 'wake',
        deviceId: deviceUUID,
      };
      sendWithoutQueue(messageData, `${messageData.op}:${deviceUUID}`, cb);
    },
    [sendWithoutQueue]
  );

  /**
   * 取一台设备的观看端凭证（Face3_qr op:"viewer"）。mode 是想要的协议，云端按它签凭证，
   * 响应 data.mode 是实际签的那种（要 LiveKit 但签不出时云端退回 KVS），按它选 SDK：
   *
   *   'kvs'      KVS 直连：AssumeRole 签一组**只能连这一个频道**的临时凭证（15 分钟），
   *              连同频道 ARN 和 ICE 服务器。频道尚未创建时云端回 channel_not_ready。
   *   'livekit'  LiveKit 房间 token（多人观看 / 多方通话 / AI 分析）。
   *
   * 先决条件：设备得先被唤醒。只在连接可用时发，鉴权在云端（必须绑过这台设备）。
   *
   * @param {string} deviceUUID
   * @param {'kvs'|'livekit'} mode
   * @param {Function} cb 回调，收到 {success, code, message, data}
   */
  const viewFace3Device = useCallback(
    (deviceUUID, mode, cb) => {
      if (!deviceUUID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_FACE3_QR,
        op: 'viewer',
        deviceId: deviceUUID,
        mode,
      };
      sendWithoutQueue(messageData, `${messageData.op}:${deviceUUID}`, cb);
    },
    [sendWithoutQueue]
  );

  const handleFace3Response = useCallback(
    (message) => {
      recordingRequests.current.handle(message);
      const callbackDeviceId = message.data?.deviceId;
      /* AI 开关的唤醒带 requestId，由 recordingRequests 按请求对回包；不再分发给按 wake:<deviceId>
         等回包的实时画面回调，免得把别人的唤醒结果当成自己的。 */
      if (message.op !== 'wake' || !Number.isSafeInteger(message.requestId)) {
        invokeCallbacks(
          callbackDeviceId && ['wake', 'viewer'].includes(message.op)
            ? { ...message, op: `${message.op}:${callbackDeviceId}` }
            : message
        );
      }
      switch (message.action) {
        case ACTION_TYPES.BIZ3_FACE3_QR:
          switch (message.op) {
            case 'streamState':
              if (message.data?.deviceId) {
                // 先写 reason 再写 state：两次更新即使没被合并，state 变化那次渲染也能读到本次 reason。
                setFace3StreamReasons((reasons) => ({
                  ...reasons,
                  [message.data.deviceId]: message.data.reason ?? null,
                }));
                setFace3StreamStates((states) => ({
                  ...states,
                  [message.data.deviceId]: message.data.state,
                }));
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
    face3StreamStates,
    face3StreamReasons,
    listFace3Recordings,
    playFace3Recording,
    deleteFace3Recording,
    synthesizeFace3Speech,
    getFace3WelcomeVid,
    listFace3WelcomeVids,
    setFace3WelcomeVid,
    wakeFace3Device,
    wakeFace3ForAi,
    requestAiSession,
    viewFace3Device,
  };
};

export default useFace3;
