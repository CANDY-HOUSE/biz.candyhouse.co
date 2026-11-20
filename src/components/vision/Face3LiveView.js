import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, IconButton, Typography, CircularProgress, Button, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { useTranslation } from 'react-i18next';
import { getFace3ViewerEnvironmentError, kvsProtocol, protocolForMode } from './protocols';
import {
  canRecord,
  canSaveMedia,
  captureVideoFrame,
  extensionForMime,
  mediaFileName,
  recordingMimeTypes,
  saveMedia,
} from './face3Utils';
import { Face3LiveToolbar, RecordingClock } from './Face3Toolbar';
import { logOperationFailure } from '@/services/operationFailure';

/** 取凭证的等待上限。sendMessage 断网时是静默丢弃的，没有回包。 */
const CRED_TIMEOUT_MS = 15000;
const CRED_RETRY_MS = 2000;
const CALL_TIMEOUT_MS = 45000;
/* 已接通的通话断开后自动重新发起的次数上限（连续、未再出画面的次数）。重新出画即清零，
   所以每次切网都能自动接回；连续失败到上限才提示中断，避免设备真离线时无限重试。 */
const AUTO_RECONNECT_MAX = 2;
/* 断开后等多久再自动重连。设备主动挂断(门铃挂断等)时，PeerConnection 往往先断、
   streamState=stopped 稍后才经 WS 到达；先等一会儿，stopped 到了就按"设备已结束"
   收尾(下方 effect 的 endPlayback 会顺带取消这次重连)，不把刚挂断的设备又唤醒。 */
const AUTO_RECONNECT_DELAY_MS = 3000;

const WAKE_ERROR_TEXT = {
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
const CRED_ERROR_TEXT = {
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
 * 由本组件决定措辞，而不是让 viewer 的 key 直接当 i18n key 用：viewer 里的
 * errTimeout 指的是"设备没在时限内出画"，和取凭证那步的网络超时完全是两回事，
 * 共用一条"网络没有响应"会把人引向错误的方向——实测就因此白查过一轮。 */
const VIEWER_ERROR_TEXT = {
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
const LOCAL_MEDIA_ERROR_TEXT = {
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

/**
 * Face3 实时画面（就地播放）。
 *
 * 直接铺满父容器——列表卡片里那块 16:9 预览框，不再用独立居中弹窗，所以视频就
 * 出现在占位框原本的位置。父组件只在观看该设备时挂载本组件，**卸载即触发清理**
 * （关 RTCPeerConnection 和信令 WebSocket），所以不需要 open 开关。
 *
 * 设备是 MASTER，这里是 VIEWER。开播前提是设备已被唤醒并开始推流 —— 唤醒是异步的，
 * T32 冷启动加上信令握手要好几秒，所以拿不到画面时优先提示"设备正在启动"
 * 而不是直接报错。
 *
 * 本组件只有一套 UI 和流程：唤醒 → 带着父组件传入的 protocol（想要的协议）取凭证 →
 * 按云端返回的 data.mode 选协议策略、启动对应 SDK 的观看端（见 ./protocols）。
 * 通话中换了想要的协议（如切了 AI 开关）会重新连接。
 *
 * label（可选）：出画后在画面正上方居中显示小号标签（红点 + 文字，无底色，如 LIVE），
 * 让同一个画面框里"现在看的是什么"一眼可辨。不传则不显示（Vision 首页和详情页都传 LIVE）。
 *
 * 画质标签：出画后左上角显示实际收到的画面档位（见 QUALITY_LEVELS：4K / 2K / FHD / HD / SD），
 * 按 <video> 的 videoWidth / videoHeight 判断。与线路无关：TURN 中继只原样转发、不重新编码，
 * 中继下照样是设备发出的分辨率；经服务器转发后变小的，显示变小后的档位。
 *
 * 话筒、扬声器：叠在画面底部正中（参考 Wyze），首页和详情页都有；只有开 / 关，不提供音量调节。
 * toolsTarget（可选）：其余工具（拍照、录制、视频对讲，见 Face3Toolbar）渲染到父组件给的这个 DOM 节点里
 * （详情页放在画面下方，图标 + 文字一排）；还没出画时灰色不可点。不传则不显示 —— Vision 首页只有话筒、扬声器。
 */
/** 画面顶部一排（左上画质、正中 LIVE / REC、右上关闭）离画面左右边缘的距离：
    左上画质标签的边框、右上关闭叉的笔画都到这里 */
const TOP_BAR_EDGE = 8;
/** 顶部一排共用的中线高度（各自 translateY(-50%) 对齐到这里）。
    定在约 13px 高的画质标签上边框离顶也是 TOP_BAR_EDGE 处，四周留白一致 */
const TOP_BAR_CENTER = 14;

/** 画面上的话筒 / 扬声器开关：小号、无底色、白色图标 */
const overlayToggleSx = {
  width: 32,
  height: 32,
  color: 'common.white',
  '& .MuiSvgIcon-root': { fontSize: 22 },
  /* 无底色：靠阴影在亮、暗画面上都看得清；开 / 关只看图标（带不带斜线） */
  filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
  '&:hover': { bgcolor: 'transparent' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)' },
};

/* 录制：最长 3 分钟，到了自动停止并保存（4K 录太久文件过大，手机内存也吃不消）。
   码率 6Mbps，4K 下画质够用，3 分钟约 135MB。 */
const MAX_RECORD_MS = 3 * 60 * 1000;
const RECORD_LOG_SCOPE = 'components/vision/Face3LiveView.record';
const RECORD_VIDEO_BPS = 6_000_000;

/** 画质档位：按实际画面的长边（横竖都算）从高到低取第一个满足的，都不满足为 SD */
const QUALITY_LEVELS = [
  [3840, '4K'],
  [2560, '2K'],
  [1920, 'FHD'],
  [1280, 'HD'],
];
const qualityLabel = (width, height) => {
  const longEdge = Math.max(width || 0, height || 0);
  if (!longEdge) return null; // 还没拿到画面尺寸
  return (QUALITY_LEVELS.find(([min]) => longEdge >= min) || [0, 'SD'])[1];
};

/* 扬声器开关与音量按设备记住，下次打开（包括门铃推送点进来自动打开）沿用。
   localStorage 在无痕/禁用存储时会抛，读不到就用默认（关、70）。 */
const DEFAULT_SPEAKER = { enabled: false, volume: 70 };
const speakerPrefKey = (deviceUUID) => `face3.speaker.${String(deviceUUID || '').toUpperCase()}`;
const loadSpeakerPref = (deviceUUID) => {
  try {
    const saved = JSON.parse(localStorage.getItem(speakerPrefKey(deviceUUID)) || 'null');
    const volume = Number(saved?.volume);
    return {
      enabled: saved?.enabled === true,
      volume: Number.isFinite(volume) && volume >= 0 && volume <= 100 ? volume : DEFAULT_SPEAKER.volume,
    };
  } catch (_) {
    return DEFAULT_SPEAKER;
  }
};
const saveSpeakerPref = (deviceUUID, enabled, volume) => {
  try {
    localStorage.setItem(speakerPrefKey(deviceUUID), JSON.stringify({ enabled, volume }));
  } catch (_) {
    /* 存不下就只影响下次的默认值 */
  }
};

/*
 * 不订阅全局 GlobalStateContext：它的值每次渲染都是新对象，任何全局状态一变（提示条、设备列表、
 * 其他设备的推送……）订阅者全都重渲，而本组件很重。需要的几样由唯一的使用方 Face3Provider
 * 作为 props 传进来：这台设备的推流状态（streamState / streamReason，只在它变时才变）、
 * 唤醒 / 取凭证函数和提示条函数（引用稳定）。再用 memo 包住（见文件末尾），
 * 只有这些 props 变了才重渲。
 */
function Face3LiveView({
  device,
  protocol = kvsProtocol,
  onClose,
  label,
  toolsTarget,
  streamState,
  streamReason,
  wakeFace3Device,
  viewFace3Device,
  setSnackbarValue,
}) {
  const { t } = useTranslation();

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const frameProbeRef = useRef(null);
  const localVideoRef = useRef(null);
  const pipDragRef = useRef(null);
  /* 观看端句柄。放 ref 不放 state：它不参与渲染，而且清理时必须拿到最新的那个，
     state 的闭包会拿到旧值。 */
  const viewerRef = useRef(null);
  const cancelAttemptRef = useRef(null);
  const [phase, setPhase] = useState('connecting'); // connecting | playing | error | ended
  const isPlaying = phase === 'playing';
  /* 拍照：截门口画面当前这一帧（原始分辨率），白光闪一下，再按环境保存（见 face3Utils） */
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const notify = (severity, key) => setSnackbarValue({ open: true, severity, msg: t(key) });
  /* 全局提示条不显示 error 级（只记日志，见 services/operationFailure）。拍照、录制是用户刚按的，
     失败要让人看到：用 warning 提示，另记一条带原因的诊断日志 */
  const notifyFailure = (action, reason, key) => {
    logOperationFailure(`components/vision/Face3LiveView.${action}`, reason);
    notify('warning', key);
  };
  const mediaName = device?.deviceName || device?.deviceUUID;
  const takeSnapshot = async () => {
    if (snapshotBusy) return;
    if (!canSaveMedia('image')) {
      notify('info', 'face3.snapshotUnsupported');
      return;
    }
    setSnapshotBusy(true);
    try {
      const blob = await captureVideoFrame(videoRef.current);
      containerRef.current
        ?.querySelector('[data-snapshot-flash]')
        ?.animate?.([{ opacity: 0.8 }, { opacity: 0 }], { duration: 300, easing: 'ease-out' });
      const result = await saveMedia(blob, mediaFileName(mediaName, 'jpg'), 'image');
      /* PC 是直接下载（浏览器可能不弹提示），明确说"已下载到本机"；分享面板里用户自己看得到结果 */
      if (result !== 'shared')
        notify('success', result === 'downloaded' ? 'face3.snapshotDownloaded' : 'face3.snapshotSaved');
    } catch (err) {
      if (err?.name === 'AbortError') return; // 用户在分享面板里取消
      notifyFailure('snapshot', err?.name || err?.message, 'face3.snapshotFailed');
    } finally {
      setSnapshotBusy(false);
    }
  };

  /* 录制：把收到的门口画面（含声音）交给 MediaRecorder 录，再按环境保存（同拍照）。
   * 录的是 MediaStream 本身，与画面框挂在哪个页面无关 —— 详情页开始录，回首页也继续录，
   * 画面正上方的 LIVE 换成 REC 计时。点停止、到时长上限、断线 / 重连、关掉实时画面都会停止，
   * 已录的部分照常保存。 */
  const recorderRef = useRef(null);
  /* startedAt：开始录制的时刻，0 = 未在录（计时显示由 RecordingClock 自己刷新，这里不跟着每秒重渲）；
     saving：停止后正在保存 */
  const [record, setRecord] = useState({ startedAt: 0, saving: false });
  const recordStartedAt = record.startedAt;
  const isRecording = recordStartedAt > 0;

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  const startRecording = () => {
    if (recorderRef.current || record.saving) return;
    if (!canSaveMedia('video')) {
      notify('info', 'face3.recordSaveUnsupported');
      return;
    }
    const stream = videoRef.current?.srcObject;
    const mimeTypes = recordingMimeTypes();
    if (!canRecord() || !stream || !mimeTypes.length) {
      notify('info', 'face3.recordUnsupported');
      return;
    }
    const startedAt = new Date();

    /* 从第 from 个候选格式起，找一个能起来的开录，返回 recorder；都不行返回 null。
     *
     * 起不来分两种：构造 / start() 当场抛（isTypeSupported 只看浏览器，不看这路流），
     * 以及 start() 之后才异步报 onerror、一帧没录到就停 —— 实测 4K 的 H.264 偶发
     * "EncodingError: Encoder initialization failed"（同一路流过一会儿又正常）。
     * 后一种也当作"这个格式不行"，丢掉这次、接着试下一个（VP9 / VP8），用户无感。 */
    const launch = (from) => {
      for (let i = from; i < mimeTypes.length; i += 1) {
        let recorder;
        try {
          recorder = new MediaRecorder(stream, { mimeType: mimeTypes[i], videoBitsPerSecond: RECORD_VIDEO_BPS });
          recorder.start(1000);
        } catch (err) {
          logOperationFailure(RECORD_LOG_SCOPE, err?.name);
          continue;
        }
        const chunks = [];
        let abandoned = false;
        const next = i + 1;
        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };
        recorder.onerror = (event) => {
          logOperationFailure(RECORD_LOG_SCOPE, event.error?.name);
          /* 还没录到任何数据就出错：换下一个格式重来；已经录了一段（如中途轨道变化）就停下，保存已录的部分 */
          if (!chunks.length && recorderRef.current === recorder) {
            abandoned = true;
            recorderRef.current = launch(next);
            if (!recorderRef.current) {
              setRecord((r) => ({ ...r, startedAt: 0 }));
              notify('warning', 'face3.recordFailed');
            }
          }
          if (recorder.state !== 'inactive') recorder.stop();
        };
        /* 流的轨道全部结束时浏览器也会自动停，统一在这里收尾 */
        recorder.onstop = async () => {
          if (abandoned) return;
          if (recorderRef.current === recorder) recorderRef.current = null;
          setRecord((r) => ({ ...r, startedAt: 0 }));
          /* 分享 / 存相册认基本类型，去掉 codecs 参数 */
          const type = (recorder.mimeType || mimeTypes[i]).split(';')[0];
          const blob = new Blob(chunks, { type });
          if (!blob.size) {
            notifyFailure('record', 'empty', 'face3.recordFailed');
            return;
          }
          setRecord((r) => ({ ...r, saving: true }));
          try {
            const result = await saveMedia(blob, mediaFileName(mediaName, extensionForMime(type), startedAt), 'video');
            if (result !== 'shared')
              notify('success', result === 'downloaded' ? 'face3.recordDownloaded' : 'face3.recordSaved');
          } catch (err) {
            if (err?.name !== 'AbortError') notifyFailure('record', err?.name || err?.message, 'face3.recordFailed');
          } finally {
            setRecord((r) => ({ ...r, saving: false }));
          }
        };
        return recorder;
      }
      return null;
    };

    const recorder = launch(0);
    if (!recorder) {
      notify('warning', 'face3.recordFailed');
      return;
    }
    recorderRef.current = recorder;
    setRecord((r) => ({ ...r, startedAt: Date.now() }));
  };

  /* 录到上限自动停 */
  useEffect(() => {
    if (!isRecording) return undefined;
    const limit = setTimeout(stopRecording, MAX_RECORD_MS);
    return () => clearTimeout(limit);
  }, [isRecording, stopRecording]);

  /* 不再出画（断线、自动重连换了新连接、结束）就停止并保存；卸载（关掉实时画面）同样 */
  useEffect(() => {
    if (!isPlaying) stopRecording();
  }, [isPlaying, stopRecording]);
  useEffect(() => stopRecording, [stopRecording]);

  /* 出画后按实际分辨率决定左上角的画质档位（4K / 2K / FHD / HD / SD）。分辨率中途变了
     （设备切码流、重连后换了流）<video> 会触发 resize，跟着更新 */
  const [quality, setQuality] = useState(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!isPlaying || !video) {
      setQuality(null);
      return undefined;
    }
    const check = () => setQuality(qualityLabel(video.videoWidth, video.videoHeight));
    check();
    video.addEventListener('resize', check);
    return () => video.removeEventListener('resize', check);
  }, [isPlaying]);
  const showQuality = isPlaying && Boolean(quality);
  const [errorKey, setErrorKey] = useState('');
  const [localMediaIssues, setLocalMediaIssues] = useState({});
  const [attempt, setAttempt] = useState(0);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [mediaStates, setMediaStates] = useState({ camera: 'disabled', microphone: 'disabled' });
  /* 视频对讲按钮亮不亮：跟用户的操作走，不跟摄像头实际状态走（见 toggleVideoCall） */
  const [videoCallOn, setVideoCallOn] = useState(false);
  /* 用户刚按开视频对讲、摄像头还没开成功。开成功时若话筒没开就顺手打开（视频通话要能说话）；
     只认用户这一次按下 —— 自动重连恢复摄像头时不动话筒，话筒按断开前的状态恢复。 */
  const micWithVideoCallRef = useRef(false);
  // 回调里要读到最新值(断开那一刻麦克风/摄像头开没开)，state 的闭包拿不到。
  const mediaStatesRef = useRef(mediaStates);
  mediaStatesRef.current = mediaStates;
  const [mediaControlsReady, setMediaControlsReady] = useState(false);
  const [observationUnsupported, setObservationUnsupported] = useState(false);
  // 通话中连接短暂断开、正在等 ICE 恢复（见 protocols/kvsViewer.js 的 DISCONNECT_GRACE_MS）。
  const [reconnecting, setReconnecting] = useState(false);
  /* 连接已经断掉、正在自动重新发起整通连接（见 AUTO_RECONNECT_MAX）。
     与上面的 reconnecting 不同：那个是同一条连接在等 ICE 自愈，这个是换一条新连接。 */
  const [autoReconnecting, setAutoReconnecting] = useState(false);
  const autoReconnectsRef = useRef(0);
  /* 供下方 stopped 处理读取最新值。在设置处同步写（见 setReconnectingNow /
     setAutoReconnectingNow），不等下一次渲染。 */
  const reconnectingRef = useRef(false);
  const autoReconnectingRef = useRef(false);
  const setReconnectingNow = useCallback((v) => {
    reconnectingRef.current = v;
    setReconnecting(v);
  }, []);
  const setAutoReconnectingNow = useCallback((v) => {
    autoReconnectingRef.current = v;
    setAutoReconnecting(v);
  }, []);
  // 当前这一轮连接是不是自动重连发起的(决定是否沿用断开前的扬声器/麦克风/摄像头)。
  const autoModeRef = useRef(false);
  // 断开那一刻的本地媒体状态，自动重连接通后恢复；应用一次即清空。
  const restoreMediaRef = useRef(null);
  /* 扬声器偏好（开关 + 音量）：首次渲染读一次本机存储（拷一份，读不到时返回的是共用的默认值）。
     回调里要读到最新值，所以放 ref；只有开关进 state 驱动图标，音量不在界面上显示 */
  const speakerRef = useRef(null);
  if (!speakerRef.current) speakerRef.current = { ...loadSpeakerPref(device?.deviceUUID) };
  const [speakerEnabled, setSpeakerEnabled] = useState(speakerRef.current.enabled);
  const [localIsMain, setLocalIsMain] = useState(false);
  /* 小窗停在哪个角。拖动过程中的位置不进 state（见 beginPipDrag），松手才定角落 */
  const [pipCorner, setPipCorner] = useState('bottom-right');
  /* 自动起播被拦时置上，用来提示用户点一下。WebView 里
     mediaPlaybackRequiresUserGesture 默认拦截连静音媒体也不放过。 */
  const [needsTap, setNeedsTap] = useState(false);

  const deviceUUID = device?.deviceUUID;
  const previousStreamStateRef = useRef(streamState);

  const clearPlayback = useCallback(() => {
    viewerRef.current?.close();
    viewerRef.current = null;
    const video = videoRef.current;
    if (frameProbeRef.current !== null) video?.cancelVideoFrameCallback?.(frameProbeRef.current);
    frameProbeRef.current = null;
    for (const element of [video, localVideoRef.current]) {
      if (element) {
        element.onloadedmetadata = null;
        element.onloadeddata = null;
        element.pause();
        element.srcObject = null;
      }
    }
  }, []);

  /* 自动重连的状态统一在这里清。出画、手动重试、结束、换设备都走它。 */
  const resetAutoReconnect = useCallback(() => {
    autoReconnectsRef.current = 0;
    autoModeRef.current = false;
    restoreMediaRef.current = null;
    setAutoReconnectingNow(false);
  }, [setAutoReconnectingNow]);

  const endPlayback = useCallback(
    (key) => {
      resetAutoReconnect();
      cancelAttemptRef.current?.();
      clearPlayback();
      setHasLocalVideo(false);
      setNeedsTap(false);
      setLocalMediaIssues({});
      setErrorKey(key);
      setPhase('ended');
    },
    [clearPlayback, resetAutoReconnect]
  );

  // 换了设备：上一台的自动重连计数与媒体恢复不能带过来。必须在发起连接的 effect 之前。
  useEffect(() => {
    resetAutoReconnect();
  }, [deviceUUID, resetAutoReconnect]);

  useEffect(() => {
    if (!deviceUUID) return undefined;

    let cancelled = false;
    let wakeSettled = false;
    let pictureReady = false;
    let wakeTimer;
    let credentialTimer;
    let retryTimer;
    let deadlineTimer;
    let reconnectTimer;
    const cancel = () => {
      cancelled = true;
      [wakeTimer, credentialTimer, retryTimer, deadlineTimer, reconnectTimer].forEach(clearTimeout);
      clearPlayback();
    };
    cancelAttemptRef.current = cancel;
    setPhase('connecting');
    setMediaStates({ camera: 'disabled', microphone: 'disabled' });
    setMediaControlsReady(false);
    setObservationUnsupported(false);
    setReconnectingNow(false);
    /* 自动重连沿用断开前的扬声器状态；手动重试/首次进入照旧从静音起。
       否则通话中途切一次网，扬声器被静默关掉，用户以为恢复了其实听不到。 */
    const keepSpeaker = autoModeRef.current && Boolean(restoreMediaRef.current?.speaker);
    setSpeakerEnabled(keepSpeaker);
    speakerRef.current.enabled = keepSpeaker;
    /* 视频对讲同理：自动重连会把断开前开着的摄像头重新打开，按钮保持亮着 */
    setVideoCallOn(autoModeRef.current && Boolean(restoreMediaRef.current?.camera));
    micWithVideoCallRef.current = false;
    setHasLocalVideo(false);
    setLocalIsMain(false);
    setPipCorner('bottom-right');
    setNeedsTap(false);
    setErrorKey('');
    setLocalMediaIssues({});

    /* 安排一次自动重连。同一串自动重连沿用第一次断开时的媒体快照：还没出画就又断时，
     * 本轮开头已把媒体状态重置成关闭，不能拿来覆盖。快照在出画时由 resetAutoReconnect 清空。
     * 定时器由 cancel() 清理（组件卸载/新一轮开始），回调里不看 cancelled ——
     * fail 路径里本轮已作废(cancelled=true)，但重连仍要发生。
     * 返回 false = 次数已用完。 */
    const scheduleAutoReconnect = () => {
      if (autoReconnectsRef.current >= AUTO_RECONNECT_MAX) return false;
      autoReconnectsRef.current += 1;
      const n = autoReconnectsRef.current;
      if (!restoreMediaRef.current) {
        restoreMediaRef.current = {
          speaker: speakerRef.current.enabled,
          microphone: mediaStatesRef.current.microphone === 'enabled',
          camera: mediaStatesRef.current.camera === 'enabled',
        };
      }
      setReconnectingNow(true);
      setAutoReconnectingNow(true);
      reconnectTimer = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.info('[face3Live] call dropped, auto reconnect #' + n);
        autoModeRef.current = true;
        setAttempt((a) => a + 1);
      }, AUTO_RECONNECT_DELAY_MS);
      return true;
    };

    const fail = (key) => {
      if (cancelled) return;
      if (autoModeRef.current) {
        /* 自动重连这一轮没成（新网络可能还没就绪）：还有次数就再试，用完才提示中断；
           用户经历的是"通话中断"，不该突然看到唤醒/超时类错误。 */
        cancelled = true;
        [wakeTimer, credentialTimer, retryTimer, deadlineTimer].forEach(clearTimeout);
        clearPlayback();
        if (!scheduleAutoReconnect()) endPlayback('face3.liveInterrupted');
        return;
      }
      cancel();
      setHasLocalVideo(false);
      setNeedsTap(false);
      setErrorKey(key);
      setPhase('error');
    };
    const markPictureReady = () => {
      if (cancelled || pictureReady || !videoRef.current?.videoWidth) return;
      pictureReady = true;
      clearTimeout(deadlineTimer);
      // 重新出画就清零：之后再切一次网仍能自动接回。
      resetAutoReconnect();
      setPhase('playing');
    };
    const startViewer = (data, start) => {
      try {
        const viewer = start(data, {
          onState: (state) => {
            if (cancelled) return;
            if (state === 'answered') {
              setMediaControlsReady(true);
              /* 自动重连接通后，把断开前开着的麦克风/摄像头重新打开。 */
              const restore = restoreMediaRef.current;
              if (restore?.microphone) viewerRef.current?.setMicrophoneEnabled?.(true);
              if (restore?.camera) viewerRef.current?.setCameraEnabled?.(true);
            }
            if (state === 'observation_supported') setObservationUnsupported(false);
            if (state === 'observation_unsupported') setObservationUnsupported(true);
            if (state === 'reconnecting') setReconnectingNow(true);
            if (state === 'reconnected') setReconnectingNow(false);
          },
          onLocalMediaState: ({ kind, state }) => {
            if (cancelled) return;
            setMediaStates((states) => ({ ...states, [kind]: state }));
            /* 视频对讲开成功：话筒没开就自动打开（开不了时照常提示话筒的错误）；没开成就不管 */
            if (kind === 'camera' && micWithVideoCallRef.current && state !== 'starting') {
              micWithVideoCallRef.current = false;
              if (state === 'enabled' && mediaStatesRef.current.microphone === 'disabled') {
                viewerRef.current?.setMicrophoneEnabled?.(true);
              }
            }
            if (state === 'starting' || state === 'enabled') {
              setLocalMediaIssues((issues) => {
                const next = { ...issues };
                delete next[kind];
                return next;
              });
            }
          },
          onLocalMediaError: ({ kind, reason }) => {
            if (cancelled || !LOCAL_MEDIA_ERROR_TEXT[kind]) return;
            if (kind === 'camera') setLocalIsMain(false);
            setLocalMediaIssues((issues) => ({
              ...issues,
              [kind]: LOCAL_MEDIA_ERROR_TEXT[kind][reason] || LOCAL_MEDIA_ERROR_TEXT[kind].unavailable,
            }));
          },
          onLocalStream: (stream) => {
            if (cancelled) return;
            const el = localVideoRef.current;
            if (!el) return;
            el.srcObject = stream;
            setHasLocalVideo(Boolean(stream));
            if (!stream) {
              setLocalIsMain(false);
              return;
            }
            // 本机预览保持静音；发送方向由Viewer转换，不受本机镜像影响。
            el.muted = true;
            el.play().catch(() => {
              if (cancelled || el.srcObject !== stream) return;
              setLocalMediaIssues((issues) => ({ ...issues, camera: 'face3.cameraPreviewUnavailable' }));
            });
          },
          onStream: (stream) => {
            if (cancelled) return;
            const el = videoRef.current;
            if (!el) return;
            // ontrack可能早于实际媒体到达，只在收到画面后结束总超时。
            el.onloadeddata = markPictureReady;
            if (el.srcObject !== stream) el.srcObject = stream;
            startFrameProbe(el);
            el.muted = !speakerRef.current.enabled;
            el.volume = speakerRef.current.volume / 100;
            viewerRef.current?.setRemoteAudio?.({
              muted: !speakerRef.current.enabled,
              volume: speakerRef.current.volume / 100,
            });
            el.play()
              .then(markPictureReady)
              .catch(() => {
                if (cancelled) return;
                el.muted = true;
                el.play()
                  .then(markPictureReady)
                  .catch(() => {});
                setNeedsTap(true);
              });
          },
          onError: (key) => fail(VIEWER_ERROR_TEXT[key] || 'face3.errLiveUnknown'),
          onEnded: () => {
            if (cancelled) return;
            /* 已接通的通话断了：先自动重新发起一次，而不是直接让用户点重试。
             *
             * 宽限期(DISCONNECT_GRACE_MS)只救得回同一条连接的短暂断开。手机在两个
             * 已存 SSID 之间切换、或 WiFi↔蜂窝切换时 IP 会变，原连接必死 ——
             * 2026-11-09 Face3 1# 实测走动时就是这样断的。重新走一遍唤醒→取凭证→
             * 连接即可接回：设备端旧会话要 30 秒才超时，期间一直醒着，新连接能立刻进来。
             * 设备主动结束(streamState=stopped)不走这里，由下方 effect 直接结束。 */
            if (!scheduleAutoReconnect()) endPlayback('face3.liveInterrupted');
          },
        });
        // 防御同步失败回调，不能把已取消的Viewer留在ref里。
        if (cancelled) viewer?.close();
        else viewerRef.current = viewer;
      } catch {
        fail('face3.errLiveUnknown');
      }
    };
    /* 带着想要的协议（wanted.mode）取凭证，按云端返回的 data.mode 选 SDK 启动观看端。
     * 要 LiveKit 签不出时云端已退回 KVS。频道未就绪稍后再取；本机加载 SDK 失败按该协议的
     * fallback 改要；其余报错。 */
    const requestSession = (wanted) => {
      if (cancelled) return;
      let settled = false;
      credentialTimer = setTimeout(() => {
        if (cancelled || settled) return;
        settled = true;
        fail('face3.errTimeout');
      }, CRED_TIMEOUT_MS);
      try {
        viewFace3Device(deviceUUID, wanted.mode, (message) => {
          if (cancelled || settled) return;
          settled = true;
          clearTimeout(credentialTimer);
          if (!message?.success) {
            if (message?.message === 'channel_not_ready') {
              retryTimer = setTimeout(() => requestSession(wanted), CRED_RETRY_MS);
            } else {
              fail(CRED_ERROR_TEXT[message?.message] || 'face3.errLiveUnknown');
            }
            return;
          }
          const granted = protocolForMode(message.data?.mode);
          // eslint-disable-next-line no-console
          console.info(`[face3Live] protocol wanted ${wanted.mode}, granted ${granted.mode}`);
          granted
            .loadViewer()
            .then((start) => {
              if (!cancelled) startViewer(message.data, start);
            })
            .catch(() => {
              if (!granted.fallback) {
                fail('face3.errLiveUnknown');
                return;
              }
              // eslint-disable-next-line no-console
              console.info(`[face3Live] ${granted.mode} sdk load failed, request ${granted.fallback.mode}`);
              requestSession(granted.fallback);
            });
        });
      } catch {
        fail('face3.errLiveUnknown');
      }
    };

    const environmentError = getFace3ViewerEnvironmentError();
    if (environmentError) {
      fail(VIEWER_ERROR_TEXT[environmentError] || 'face3.errLiveUnknown');
    } else {
      // 状态推送可能被另一个浏览器接收，不能作为握手的必需条件。
      deadlineTimer = setTimeout(() => fail('face3.errLiveTimeout'), CALL_TIMEOUT_MS);
      wakeTimer = setTimeout(() => fail('face3.errTimeout'), CRED_TIMEOUT_MS);
      try {
        wakeFace3Device(deviceUUID, (message) => {
          if (cancelled || wakeSettled) return;
          wakeSettled = true;
          clearTimeout(wakeTimer);
          if (!message?.success) {
            fail(WAKE_ERROR_TEXT[message?.message] || 'face3.wakeFailed');
            return;
          }
          requestSession(protocol);
        });
      } catch {
        fail('face3.wakeFailed');
      }
    }

    return () => {
      cancel();
      if (cancelAttemptRef.current === cancel) cancelAttemptRef.current = null;
    };
  }, [
    deviceUUID,
    protocol,
    wakeFace3Device,
    viewFace3Device,
    attempt,
    clearPlayback,
    endPlayback,
    resetAutoReconnect,
    setReconnectingNow,
    setAutoReconnectingNow,
  ]);

  useEffect(() => {
    // 忽略挂载时上一次通话残留的stopped，只响应本次看到的状态变化。
    const previous = previousStreamStateRef.current;
    previousStreamStateRef.current = streamState;
    if (streamState === 'stopped' && previous !== 'stopped') {
      /* 正在等 ICE 恢复或自动重连时收到的 stopped（原因不是门铃挂断），是设备因为
       * 我们这条连接断了、没人在看而进了待机，不是设备主动结束通话：继续重连，
       * 重连时的唤醒会把它重新拉起来。2026-11-09 Face3 1# 实测：手机切网后
       * 设备先于手机的自动重连进入待机，原逻辑把这条 stopped 当成「设备已结束」，
       * 自动重连被取消。门铃挂断（reason=doorbell）照旧立即结束。 */
      if (streamReason !== 'doorbell' && (reconnectingRef.current || autoReconnectingRef.current)) {
        // eslint-disable-next-line no-console
        console.info('[face3Live] device stopped while reconnecting, keep reconnecting');
        return;
      }
      endPlayback('face3.liveEndedByDevice');
    }
  }, [streamState, streamReason, endPlayback]);

  /* 每多少帧打一行。15fps 下约两秒一行，和设备侧 KVS_LAT_LOG_EVERY 对齐。 */
  const FRAME_LOG_EVERY = 30;

  /* 呈现间隔超过这个值就算一次卡顿并立刻记下来。
     标称 67.6ms(14.8fps)；Chrome 判定 freeze 的门槛约 217ms，这里取 150ms——
     比它低一点，能抓到"还没算 freeze 但已经在抖"的那些。
     和设备侧 KVS_CAP_GAP_WARN_US 取同一个数，两边门槛一致才好对照。 */
  const FRAME_GAP_WARN_MS = 150;

  /* 逐帧计时。
   *
   * requestVideoFrameCallback 给的是**这一帧**的时间线，比 getStats 的平均值
   * 精确得多：
   *   rtpTimestamp        这一帧在 RTP 时间轴上的取值。设备侧 kvs_lat 日志里的
   *                       rtp90k 是同一个数，两边按它对齐就锁定了同一帧。
   *   receiveTime         最后一个包收到的时刻
   *   presentationTime    提交合成的时刻
   *   expectedDisplayTime 预计上屏的时刻
   *   processingDuration  解码耗时
   * recv→disp 那段是**播放端自己**的延迟(抖动缓冲+解码+渲染)，不含网络，
   * 所以它和设备侧 wall_ms 的差值才是网络+发送侧的部分。
   *
   * captureTime 只有发送端带了 abs-capture-time RTP 扩展才有值；KVS 嵌入式
   * SDK 不带，所以这里通常是 undefined，真正的端到端得靠两边 wall clock 对齐。
   */
  const startFrameProbe = (el) => {
    if (typeof el.requestVideoFrameCallback !== 'function') {
      // eslint-disable-next-line no-console
      console.warn('[face3Lat] requestVideoFrameCallback 不可用，退回只看 getStats');
      return;
    }
    if (frameProbeRef.current !== null) el.cancelVideoFrameCallback?.(frameProbeRef.current);
    let n = 0;
    let lastPresent = 0;
    let gapCount = 0;
    const onFrame = (nowMs, meta) => {
      /* 卡顿要立刻记，且带上 rtp90k——设备侧日志按同一个数对齐，就能判断
         这一跳是设备没发出来，还是发了但手机没按时呈现。只看聚合的
         freezeCount 分不出这两者。 */
      if (lastPresent) {
        const gap = Math.round(meta.presentationTime - lastPresent);
        if (gap > FRAME_GAP_WARN_MS) {
          gapCount++;
          // eslint-disable-next-line no-console
          console.warn(`[face3Lat] GAP ${gap}ms (#${gapCount}) rtp90k=${meta.rtpTimestamp} wallMs=${Date.now()}`);
        }
      }
      lastPresent = meta.presentationTime;

      if (n++ % FRAME_LOG_EVERY === 0) {
        const recv2disp = meta.receiveTime !== undefined ? Math.round(meta.presentationTime - meta.receiveTime) : null;
        // eslint-disable-next-line no-console
        console.info(
          '[face3Lat] ' +
            JSON.stringify({
              frames: meta.presentedFrames,
              rtp90k: meta.rtpTimestamp,
              wallMs: Date.now(),
              recv2dispMs: recv2disp,
              decodeMs: meta.processingDuration !== undefined ? Math.round(meta.processingDuration * 1000) : null,
              toDisplayMs: Math.round(meta.expectedDisplayTime - nowMs),
              size: `${meta.width}x${meta.height}`,
              /* 有值说明发送端带了 abs-capture-time，那就能直接算端到端 */
              captureTime: meta.captureTime ?? null,
            })
        );
      }
      frameProbeRef.current = el.requestVideoFrameCallback(onFrame);
    };
    frameProbeRef.current = el.requestVideoFrameCallback(onFrame);
  };

  const updateSpeaker = (enabled, nextVolume = speakerRef.current.volume) => {
    setSpeakerEnabled(enabled);
    speakerRef.current.enabled = enabled;
    speakerRef.current.volume = nextVolume;
    saveSpeakerPref(deviceUUID, enabled, nextVolume);
    // 多方通话时其他手机的声音也跟随扬声器开关（KVS 直连没有这一路，方法不存在）。
    viewerRef.current?.setRemoteAudio?.({ muted: !enabled, volume: nextVolume / 100 });
    const video = videoRef.current;
    if (!video) return;
    video.muted = !enabled;
    video.volume = nextVolume / 100;
    if (enabled)
      video
        .play()
        .then(() => setNeedsTap(false))
        .catch(() => setNeedsTap(true));
    else setNeedsTap(false);
  };

  /* 带声起播被 WebView 拦下时(onStream 里退回静音并置 needsTap)，用户在画面上随便点一下
     就按记住的设置恢复，不翻转扬声器开关。点的是按钮/滑块则交给它们自己处理 ——
     否则这里先恢复出声，扬声器按钮的 onClick 紧接着又把它关掉。 */
  const resumeOnTap = (event) => {
    if (!needsTap || event.target.closest?.('button, .MuiSlider-root')) return;
    viewerRef.current?.setRemoteAudio?.({
      muted: !speakerRef.current.enabled,
      volume: speakerRef.current.volume / 100,
    });
    const video = videoRef.current;
    if (!video) return;
    video.muted = !speakerRef.current.enabled;
    video.volume = speakerRef.current.volume / 100;
    video
      .play()
      .then(() => setNeedsTap(false))
      .catch(() => {});
  };

  const toggleLocalMedia = (kind) => {
    const enabled = mediaStates[kind] === 'disabled';
    if (kind === 'camera') viewerRef.current?.setCameraEnabled?.(enabled);
    else viewerRef.current?.setMicrophoneEnabled?.(enabled);
  };

  /* 视频对讲按"用户按了没有"亮灭，不看摄像头有没有开成功：按下即亮并申请摄像头；
     再按一次一律取消 —— 申请中就中止，已开就关，失败了就把失败提示和小窗一起清掉。 */
  const toggleVideoCall = () => {
    if (!videoCallOn) {
      setVideoCallOn(true);
      micWithVideoCallRef.current = true;
      viewerRef.current?.setCameraEnabled?.(true);
      return;
    }
    micWithVideoCallRef.current = false;
    setVideoCallOn(false);
    viewerRef.current?.setCameraEnabled?.(false);
    setLocalIsMain(false);
    setLocalMediaIssues((issues) => {
      if (!issues.camera) return issues;
      const next = { ...issues };
      delete next.camera;
      return next;
    });
  };

  const retry = () => {
    resetAutoReconnect();
    setAttempt((n) => n + 1);
  };

  const PIP_MARGIN = 12;
  const pipCornerStyle = {
    'top-left': { top: PIP_MARGIN, left: PIP_MARGIN },
    'top-right': { top: PIP_MARGIN, right: PIP_MARGIN },
    'bottom-left': { bottom: PIP_MARGIN, left: PIP_MARGIN },
    'bottom-right': { bottom: PIP_MARGIN, right: PIP_MARGIN },
  }[pipCorner];

  /* 拖小窗：拖动中直接改元素的 transform 跟手，不走 state —— 每个 pointermove 都重渲
     整个组件太重。松手才按离得最近的角落定 pipCorner（一次渲染），并把 transform、cursor
     还原成 React 设的值（镜像用的 scaleX(-1) 也在 transform 里，所以平移放在它前面）。 */
  const beginPipDrag = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    event.preventDefault();
    const el = event.currentTarget;
    el.setPointerCapture?.(event.pointerId);
    const containerRect = container.getBoundingClientRect();
    const pipRect = el.getBoundingClientRect();
    const left = pipRect.left - containerRect.left;
    const top = pipRect.top - containerRect.top;
    pipDragRef.current = {
      el,
      baseTransform: el.style.transform,
      baseCursor: el.style.cursor,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left,
      top,
      currentLeft: left,
      currentTop: top,
      width: pipRect.width,
      height: pipRect.height,
      moved: false,
    };
    el.style.cursor = 'grabbing';
  };

  const movePip = (event) => {
    const drag = pipDragRef.current;
    const container = containerRef.current;
    if (!drag || !container || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 6) drag.moved = true;
    const rect = container.getBoundingClientRect();
    const maxLeft = Math.max(PIP_MARGIN, rect.width - drag.width - PIP_MARGIN);
    const maxTop = Math.max(PIP_MARGIN, rect.height - drag.height - PIP_MARGIN);
    const left = Math.min(Math.max(PIP_MARGIN, drag.left + dx), maxLeft);
    const top = Math.min(Math.max(PIP_MARGIN, drag.top + dy), maxTop);
    drag.currentLeft = left;
    drag.currentTop = top;
    const base = drag.baseTransform && drag.baseTransform !== 'none' ? ` ${drag.baseTransform}` : '';
    drag.el.style.transform = `translate(${left - drag.left}px, ${top - drag.top}px)${base}`;
  };

  const finishPipDrag = (event, cancelled = false) => {
    const drag = pipDragRef.current;
    const container = containerRef.current;
    if (!drag || !container || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const rect = container.getBoundingClientRect();
    const maxLeft = Math.max(PIP_MARGIN, rect.width - drag.width - PIP_MARGIN);
    const maxTop = Math.max(PIP_MARGIN, rect.height - drag.height - PIP_MARGIN);
    const corners = [
      ['top-left', PIP_MARGIN, PIP_MARGIN],
      ['top-right', maxLeft, PIP_MARGIN],
      ['bottom-left', PIP_MARGIN, maxTop],
      ['bottom-right', maxLeft, maxTop],
    ];
    const nearest = corners.reduce(
      (best, item) => {
        const distance = (drag.currentLeft - item[1]) ** 2 + (drag.currentTop - item[2]) ** 2;
        return distance < best.distance ? { name: item[0], distance } : best;
      },
      { name: pipCorner, distance: Number.POSITIVE_INFINITY }
    );
    drag.el.style.transform = drag.baseTransform;
    drag.el.style.cursor = drag.baseCursor;
    setPipCorner(nearest.name);
    pipDragRef.current = null;
    if (!cancelled && !drag.moved) setLocalIsMain((value) => !value);
  };

  const videoStyle = (isLocal) => {
    const isPip = isLocal ? !localIsMain : localIsMain;
    if (!isPip) {
      return {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
        transform: isLocal ? 'scaleX(-1)' : 'none',
      };
    }
    return {
      position: 'absolute',
      ...pipCornerStyle,
      width: 'clamp(84px, 25%, 132px)',
      aspectRatio: '4 / 3',
      objectFit: 'cover',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.7)',
      boxShadow: '0 3px 12px rgba(0,0,0,0.45)',
      background: '#111',
      transform: isLocal ? 'scaleX(-1)' : 'none',
      touchAction: 'none',
      cursor: 'grab',
      zIndex: 2,
    };
  };

  // 默认关闭不占小窗；申请中或取不到画面时保留转圈提示和具体错误。
  const cameraLoading =
    phase === 'playing' &&
    (mediaStates.camera === 'starting' ||
      Boolean(localMediaIssues.camera) ||
      (mediaStates.camera === 'enabled' && !hasLocalVideo));

  /* 铺满父容器（卡片的 16:9 预览框）。父级已是 position:relative + overflow:hidden，
     所以这里 inset:0 就正好落在占位框的位置和尺寸上。 */
  return (
    <Box
      ref={containerRef}
      onPointerDownCapture={resumeOnTap}
      sx={{ position: 'absolute', inset: 0, bgcolor: '#000', overflow: 'hidden' }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        onPointerDown={(event) => localIsMain && beginPipDrag(event)}
        onPointerMove={(event) => localIsMain && movePip(event)}
        onPointerUp={(event) => localIsMain && finishPipDrag(event)}
        onPointerCancel={(event) => localIsMain && finishPipDrag(event, true)}
        style={{
          ...videoStyle(false),
          display: phase === 'playing' ? 'block' : 'none',
        }}
      />

      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        onPointerDown={(event) => !localIsMain && beginPipDrag(event)}
        onPointerMove={(event) => !localIsMain && movePip(event)}
        onPointerUp={(event) => !localIsMain && finishPipDrag(event)}
        onPointerCancel={(event) => !localIsMain && finishPipDrag(event, true)}
        style={{
          ...videoStyle(true),
          display: phase === 'playing' && hasLocalVideo && !cameraLoading ? 'block' : 'none',
        }}
      />

      {cameraLoading && (
        <Box
          role="status"
          aria-label={t('face3.camera')}
          aria-busy="true"
          sx={{
            ...videoStyle(true),
            transform: 'none',
            borderRadius: '10px',
            cursor: 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} disableShrink aria-hidden="true" />
        </Box>
      )}

      {(phase === 'connecting' || phase === 'playing') &&
        ((reconnecting && phase === 'playing') ||
          observationUnsupported ||
          Object.keys(localMediaIssues).length > 0) && (
          <Box
            sx={{
              position: 'absolute',
              /* 有顶部标签（LIVE / REC / 4K）时让出那一行 */
              top: ((label || isRecording) && phase === 'playing') || showQuality ? TOP_BAR_CENTER + 10 : 8,
              left: 8,
              right: 48,
              zIndex: 3,
              maxHeight: '55%',
              overflowY: 'auto',
            }}
          >
            {reconnecting && phase === 'playing' && (
              <Alert role="status" severity="info" sx={{ mb: 0.5, py: 0, fontSize: '0.75rem' }}>
                {t('face3.liveReconnecting')}
              </Alert>
            )}
            {observationUnsupported && (
              <Alert severity="warning" sx={{ mb: 0.5, py: 0, fontSize: '0.75rem' }}>
                {t('face3.observationUnsupported')}
              </Alert>
            )}
            {Object.entries(localMediaIssues).map(([kind, key]) => (
              <Alert key={kind} severity="warning" sx={{ mb: 0.5, py: 0, fontSize: '0.75rem' }}>
                {t(key)}
              </Alert>
            ))}
          </Box>
        )}

      {/* 画质档位（4K / 2K / FHD / HD / SD）：左上角，细描边、无底色，与 LIVE 同样尽量不挡画面 */}
      {showQuality && (
        <Box
          sx={{
            position: 'absolute',
            /* 与 LIVE、右上角关闭按钮同一条中线 */
            top: TOP_BAR_CENTER,
            transform: 'translateY(-50%)',
            left: TOP_BAR_EDGE,
            zIndex: 3,
            px: '3px',
            /* 上下留白要看起来一样：大写字母 / 数字在行盒里并不居中（下方留了降部的空间，
               各平台字体还不同）。支持 text-box 的浏览器把行盒裁到大写字母顶和基线，
               上下内边距就是实际留白；不支持的（旧 WebView）按默认字体实测的偏移补 */
            pt: '0.8px',
            pb: '1.2px',
            '@supports (text-box: trim-both cap alphabetic)': {
              textBox: 'trim-both cap alphabetic',
              py: '2px',
            },
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: 0.5,
            color: 'common.white',
            fontSize: 9,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '0.04em',
            textShadow: '0 0 2px rgba(0,0,0,0.8)',
            boxShadow: '0 0 2px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        >
          {quality}
        </Box>
      )}

      {/* LIVE：正上方居中。小号、无底色，只靠红点和文字阴影在亮暗画面上都看得清，尽量不挡画面。
          录制中换成 REC + 计时，红点闪烁 */}
      {(label || isRecording) && phase === 'playing' && (
        <Box
          sx={{
            position: 'absolute',
            top: TOP_BAR_CENTER,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'common.white',
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '0.06em',
            textShadow: '0 0 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
          }}
        >
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: '#FF3B30',
              boxShadow: '0 0 2px rgba(0,0,0,0.6)',
              ...(isRecording && {
                animation: 'face3RecBlink 1s steps(1) infinite',
                '@keyframes face3RecBlink': { '50%': { opacity: 0 } },
              }),
            }}
          />
          {isRecording ? (
            <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              REC <RecordingClock startedAt={recordStartedAt} />
            </Box>
          ) : (
            label
          )}
        </Box>
      )}

      {phase === 'playing' && needsTap && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            {t('face3.liveTapToPlay')}
          </Typography>
        </Box>
      )}

      {phase !== 'playing' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            px: 3,
            textAlign: 'center',
          }}
        >
          {phase === 'ended' ? (
            <>
              <Typography role="status" variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {t(errorKey)}
              </Typography>
              <Button variant="outlined" size="small" onClick={onClose} sx={{ color: 'white' }}>
                {t('face3.liveClose')}
              </Button>
            </>
          ) : phase === 'error' ? (
            <>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {t(errorKey)}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={retry}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                {t('face3.retry')}
              </Button>
            </>
          ) : (
            <>
              <CircularProgress size={28} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {t(autoReconnecting ? 'face3.liveReconnecting' : 'face3.liveConnecting')}
              </Typography>
            </>
          )}
        </Box>
      )}

      {/* 拍照时画面白光闪一下：平时透明，拍照时由 takeSnapshot 直接播动画（不为它重渲） */}
      <Box
        data-snapshot-flash
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          bgcolor: 'common.white',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* 话筒 + 扬声器：画面底部正中，两个小号无底色的开关 */}
      {phase === 'playing' && (
        <Box
          sx={{
            position: 'absolute',
            /* 贴底，少挡画面（按钮自带约 5px 内边距，图标离底边约 5px） */
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4,
            display: 'flex',
            gap: 2,
          }}
        >
          <IconButton
            aria-label={t('face3.microphone')}
            aria-pressed={mediaStates.microphone === 'enabled'}
            disabled={!mediaControlsReady}
            onClick={() => toggleLocalMedia('microphone')}
            sx={overlayToggleSx}
          >
            {mediaStates.microphone === 'starting' ? (
              <CircularProgress size={20} sx={{ color: 'common.white' }} />
            ) : mediaStates.microphone === 'enabled' ? (
              <MicIcon />
            ) : (
              <MicOffIcon />
            )}
          </IconButton>
          <IconButton
            aria-label={t('face3.speaker')}
            aria-pressed={speakerEnabled}
            onClick={() => updateSpeaker(!speakerEnabled, 100)}
            sx={overlayToggleSx}
          >
            {speakerEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
          </IconButton>
        </Box>
      )}

      {/* 其余工具（拍照、录制、视频对讲）：不叠在画面上，渲染到父组件给的位置（详情页画面下方）。
          连接中 / 出错时也在，只是灰色不可点；出画后可用。
          portal 包在 Fragment 里：直接做 MUI Box 的子节点会被它的 propTypes 判成"不是 ReactNode"报警告 */}
      {toolsTarget && (
        <>
          {createPortal(
            <Face3LiveToolbar
              disabled={phase !== 'playing'}
              snapshotBusy={snapshotBusy}
              onSnapshot={takeSnapshot}
              recordStartedAt={recordStartedAt}
              recordSaving={record.saving}
              onRecord={isRecording ? stopRecording : startRecording}
              videoCallOn={videoCallOn}
              videoCallReady={mediaControlsReady}
              onVideoCall={toggleVideoCall}
            />,
            toolsTarget
          )}
        </>
      )}

      <IconButton
        onClick={onClose}
        aria-label={t('face3.cancel')}
        sx={{
          position: 'absolute',
          /* 与左上角画质、正上方 LIVE 同一条中线 */
          top: TOP_BAR_CENTER,
          transform: 'translateY(-50%)',
          /* 看得见的叉离右边 = 画质标签离左边（TOP_BAR_EDGE）。按钮四周有 8px 内边距，
             叉在 20px 图标框里右侧还空约 4px，都要扣掉；按钮因此略伸出画面框（被裁掉），
             可点范围不变 */
          right: TOP_BAR_EDGE - 8 - 4,
          color: 'white',
          zIndex: 3,
          /* 无底色：和话筒 / 扬声器一样靠阴影在亮、暗画面上都看得清 */
          filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
          '&:hover': { bgcolor: 'transparent' },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default React.memo(Face3LiveView);
