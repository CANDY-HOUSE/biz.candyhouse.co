import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography, CircularProgress, Button, Alert, Slider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { startFace3Viewer, getFace3ViewerEnvironmentError } from '@utils/face3Viewer';

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

/** face3Viewer 的错误 key → 文案。
 *
 * 由本组件决定措辞，而不是让 viewer 的 key 直接当 i18n key 用：viewer 里的
 * errTimeout 指的是"设备没在时限内出画"，和取凭证那步的网络超时完全是两回事，
 * 共用一条"网络没有响应"会把人引向错误的方向——实测就因此白查过一轮。 */
const VIEWER_ERROR_TEXT = {
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
 * T32 冷启动加上 KVS 信令握手要好几秒，所以拿不到画面时优先提示"设备正在启动"
 * 而不是直接报错。
 */
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

export default function Face3LiveView({ device, onClose }) {
  const { t } = useTranslation();
  const { gFace3 } = useContext(GlobalStateContext);
  const { wakeFace3Device, viewFace3Device, face3StreamStates, face3StreamReasons } = gFace3;

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
  const [errorKey, setErrorKey] = useState('');
  const [localMediaIssues, setLocalMediaIssues] = useState({});
  const [attempt, setAttempt] = useState(0);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [mediaStates, setMediaStates] = useState({ camera: 'disabled', microphone: 'disabled' });
  // 回调里要读到最新值(断开那一刻麦克风/摄像头开没开)，state 的闭包拿不到。
  const mediaStatesRef = useRef(mediaStates);
  mediaStatesRef.current = mediaStates;
  const [mediaControlsReady, setMediaControlsReady] = useState(false);
  const [observationUnsupported, setObservationUnsupported] = useState(false);
  // 通话中连接短暂断开、正在等 ICE 恢复（见 face3Viewer 的 DISCONNECT_GRACE_MS）。
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
  const [initialSpeaker] = useState(() => loadSpeakerPref(device?.deviceUUID));
  const [speakerEnabled, setSpeakerEnabled] = useState(initialSpeaker.enabled);
  const [volume, setVolume] = useState(initialSpeaker.volume);
  const speakerEnabledRef = useRef(initialSpeaker.enabled);
  const volumeRef = useRef(initialSpeaker.volume);
  const [localIsMain, setLocalIsMain] = useState(false);
  const [pipCorner, setPipCorner] = useState('bottom-right');
  const [pipPosition, setPipPosition] = useState(null);
  /* 自动起播被拦时置上，用来提示用户点一下。WebView 里
     mediaPlaybackRequiresUserGesture 默认拦截连静音媒体也不放过。 */
  const [needsTap, setNeedsTap] = useState(false);

  const deviceUUID = device?.deviceUUID;
  const streamState = face3StreamStates?.[deviceUUID];
  const streamReason = face3StreamReasons?.[deviceUUID];
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
    speakerEnabledRef.current = keepSpeaker;
    setHasLocalVideo(false);
    setLocalIsMain(false);
    setPipCorner('bottom-right');
    setPipPosition(null);
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
          speaker: speakerEnabledRef.current,
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
    const startViewer = (data) => {
      try {
        const viewer = startFace3Viewer(data, {
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
            el.muted = !speakerEnabledRef.current;
            el.volume = volumeRef.current / 100;
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
    const requestCredentials = () => {
      if (cancelled) return;
      let settled = false;
      credentialTimer = setTimeout(() => fail('face3.errTimeout'), CRED_TIMEOUT_MS);
      try {
        viewFace3Device(deviceUUID, (message) => {
          if (cancelled || settled) return;
          settled = true;
          clearTimeout(credentialTimer);
          if (!message?.success) {
            if (message?.message === 'channel_not_ready') {
              retryTimer = setTimeout(requestCredentials, CRED_RETRY_MS);
            } else {
              fail(CRED_ERROR_TEXT[message?.message] || 'face3.errLiveUnknown');
            }
            return;
          }
          startViewer(message.data);
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
          requestCredentials();
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

  const updateSpeaker = (enabled, nextVolume = volumeRef.current) => {
    setSpeakerEnabled(enabled);
    speakerEnabledRef.current = enabled;
    setVolume(nextVolume);
    volumeRef.current = nextVolume;
    saveSpeakerPref(deviceUUID, enabled, nextVolume);
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
    const video = videoRef.current;
    if (!video) return;
    video.muted = !speakerEnabledRef.current;
    video.volume = volumeRef.current / 100;
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

  const retry = () => {
    resetAutoReconnect();
    setAttempt((n) => n + 1);
  };

  const PIP_MARGIN = 12;
  const pipCornerStyle = {
    'top-left': { top: PIP_MARGIN, left: PIP_MARGIN },
    'top-right': { top: PIP_MARGIN, right: PIP_MARGIN },
    'bottom-left': { bottom: PIP_MARGIN + 52, left: PIP_MARGIN },
    'bottom-right': { bottom: PIP_MARGIN + 52, right: PIP_MARGIN },
  }[pipCorner];

  const beginPipDrag = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const containerRect = container.getBoundingClientRect();
    const pipRect = event.currentTarget.getBoundingClientRect();
    const left = pipRect.left - containerRect.left;
    const top = pipRect.top - containerRect.top;
    pipDragRef.current = {
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
    setPipPosition({ left, top });
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
    setPipPosition({ left, top });
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
    setPipCorner(nearest.name);
    setPipPosition(null);
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
      ...(pipPosition ? { left: pipPosition.left, top: pipPosition.top } : pipCornerStyle),
      width: 'clamp(84px, 25%, 132px)',
      aspectRatio: '4 / 3',
      objectFit: 'cover',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.7)',
      boxShadow: '0 3px 12px rgba(0,0,0,0.45)',
      background: '#111',
      transform: isLocal ? 'scaleX(-1)' : 'none',
      touchAction: 'none',
      cursor: pipPosition ? 'grabbing' : 'grab',
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
            sx={{ position: 'absolute', top: 8, left: 8, right: 48, zIndex: 3, maxHeight: '55%', overflowY: 'auto' }}
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

      {phase === 'playing' && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            right: 8,
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            p: 0.5,
            borderRadius: 1,
            bgcolor: 'rgba(20,20,20,0.85)',
            color: 'white',
          }}
        >
          <Button
            size="small"
            aria-label={t('face3.microphone')}
            aria-pressed={mediaStates.microphone !== 'disabled'}
            disabled={!mediaControlsReady}
            onClick={() => toggleLocalMedia('microphone')}
            startIcon={
              mediaStates.microphone === 'starting' ? (
                <CircularProgress size={16} />
              ) : mediaStates.microphone === 'enabled' ? (
                <MicIcon />
              ) : (
                <MicOffIcon />
              )
            }
            sx={{ color: 'white', minWidth: 0, fontSize: '0.75rem' }}
          >
            {t('face3.microphone')}
          </Button>
          <Button
            size="small"
            aria-label={t('face3.camera')}
            aria-pressed={mediaStates.camera !== 'disabled'}
            disabled={!mediaControlsReady}
            onClick={() => toggleLocalMedia('camera')}
            startIcon={
              mediaStates.camera === 'starting' ? (
                <CircularProgress size={16} />
              ) : mediaStates.camera === 'enabled' ? (
                <VideocamIcon />
              ) : (
                <VideocamOffIcon />
              )
            }
            sx={{ color: 'white', minWidth: 0, fontSize: '0.75rem' }}
          >
            {t('face3.camera')}
          </Button>
          <IconButton
            size="small"
            aria-label={t('face3.speaker')}
            aria-pressed={speakerEnabled}
            onClick={() => updateSpeaker(!speakerEnabled, volume || 70)}
            sx={{ color: 'white' }}
          >
            {speakerEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
          </IconButton>
          <Slider
            size="small"
            aria-label={t('face3.volume')}
            value={speakerEnabled ? volume : 0}
            onChange={(event, value) => updateSpeaker(value > 0, value)}
            min={0}
            max={100}
            sx={{ minWidth: 40, maxWidth: 120, mx: 0.5 }}
          />
        </Box>
      )}

      <IconButton
        onClick={onClose}
        aria-label={t('face3.cancel')}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'rgba(0,0,0,0.5)',
          color: 'white',
          zIndex: 3,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
