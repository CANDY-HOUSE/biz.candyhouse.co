/**
 * Face3LiveView 的纯数据常量：连接/重连参数与各阶段错误文案映射。
 * 从 Face3LiveView.js 抽出，只为了控制主文件行数，语义以原注释为准。
 */

/** 取凭证的等待上限。sendMessage 断网时是静默丢弃的，没有回包。 */
export const CRED_TIMEOUT_MS = 15000;
export const CRED_RETRY_MS = 2000;
export const CALL_TIMEOUT_MS = 45000;
/* 已接通的通话断开后自动重新发起的次数上限（连续、未再出画面的次数）。重新出画即清零，
   所以每次切网都能自动接回；连续失败到上限才提示中断，避免设备真离线时无限重试。 */
export const AUTO_RECONNECT_MAX = 2;
/* 断开后等多久再自动重连。设备主动挂断(门铃挂断等)时，PeerConnection 往往先断、
   streamState=stopped 稍后才经 WS 到达；先等一会儿，stopped 到了就按"设备已结束"
   收尾(Face3LiveView 里 effect 的 endPlayback 会顺带取消这次重连)，不把刚挂断的设备又唤醒。 */
export const AUTO_RECONNECT_DELAY_MS = 3000;

export const WAKE_ERROR_TEXT = {
  device_offline: 'face3.wakeOffline',
  not_bound: 'face3.wakeNotBound',
  device_identity_rejected: 'face3.wakeIdentityRejected',
  device_not_signable: 'face3.wakeNeedsUpdate',
  ws_disconnected: 'face3.errTimeout',
};

/** 云端拒绝的原因 → 文案。都是要用户知道下一步做什么的情况。
 *
 * 设备侧那三个(离线/身份被拒/签不出命令)与唤醒按钮是同一批成因，
 * 复用 wake* 的文案，避免同一件事在两处说法不一致。 */
export const CRED_ERROR_TEXT = {
  not_bound: 'face3.errNotBound',
  channel_not_ready: 'face3.liveNotReady',
  invalid_device_id: 'face3.errLiveUnknown',
  not_authenticated: 'face3.errNotAuthenticated',
  device_offline: 'face3.wakeOffline',
  device_identity_rejected: 'face3.wakeIdentityRejected',
  device_not_signable: 'face3.wakeNeedsUpdate',
  ws_disconnected: 'face3.errTimeout',
};

/** 观看端（kvsViewer / liveKitViewer）的错误 key → 文案。
 *
 * 由 Face3LiveView 决定措辞，而不是让 viewer 的 key 直接当 i18n key 用：viewer 里的
 * errTimeout 指的是"设备没在时限内出画"，和取凭证那步的网络超时完全是两回事，
 * 共用一条"网络没有响应"会把人引向错误的方向——实测就因此白查过一轮。 */
export const VIEWER_ERROR_TEXT = {
  /* LiveKit：Bridge 重连门铃失败（face3.door=offline），与唤醒时离线同一提示。 */
  errDoorOffline: 'face3.wakeOffline',
  errTimeout: 'face3.errLiveTimeout',
  errPeerFailed: 'face3.errPeerFailed',
  errSignaling: 'face3.errSignaling',
  errSignalingClosed: 'face3.errSignalingClosed',
  errInsecureContext: 'face3.errInsecureContext',
  errBadConfig: 'face3.errBadConfig',
};

// 本地发送失败独立提示，不阻断Face3接收画面，也不终止仍可用的音视频。
export const LOCAL_MEDIA_ERROR_TEXT = {
  camera: {
    permission_denied: 'face3.cameraPermissionDenied',
    not_found: 'face3.cameraNotFound',
    unsupported: 'face3.cameraUnsupported',
    unavailable: 'face3.cameraUnavailable',
    timeout: 'face3.cameraTimeout',
    busy: 'face3.intercomBusy',
  },
  microphone: {
    permission_denied: 'face3.microphonePermissionDenied',
    not_found: 'face3.microphoneNotFound',
    unsupported: 'face3.microphoneUnsupported',
    unavailable: 'face3.microphoneUnavailable',
    timeout: 'face3.microphoneTimeout',
    busy: 'face3.intercomBusy',
  },
};
