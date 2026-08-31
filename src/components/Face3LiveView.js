import React, { useContext, useEffect, useRef, useState } from 'react';
import { Box, Dialog, IconButton, Typography, CircularProgress, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { startFace3Viewer } from '@utils/face3Viewer';

/** 取凭证的等待上限。sendMessage 断网时是静默丢弃的，没有回包。 */
const CRED_TIMEOUT_MS = 15000;

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

/**
 * Face3 实时画面。
 *
 * 设备是 MASTER，这里是 VIEWER。开播前提是设备已被唤醒并开始推流 ——
 * 唤醒是异步的，T32 冷启动加上 KVS 信令握手要好几秒，所以拿不到画面时
 * 优先提示"设备正在启动"而不是直接报错。
 */
export default function Face3LiveView({ open, device, onClose }) {
  const { t } = useTranslation();
  const { gFace3Qr } = useContext(GlobalStateContext);
  const { viewFace3Device } = gFace3Qr;

  const videoRef = useRef(null);
  /* 观看端句柄。放 ref 不放 state：它不参与渲染，而且清理时必须拿到最新的那个，
     state 的闭包会拿到旧值。 */
  const viewerRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | connecting | playing | error
  const [errorKey, setErrorKey] = useState('');
  const [attempt, setAttempt] = useState(0);
  /* 自动起播被拦时置上，用来提示用户点一下。WebView 里
     mediaPlaybackRequiresUserGesture 默认拦截连静音媒体也不放过。 */
  const [needsTap, setNeedsTap] = useState(false);

  const deviceId = device?.deviceId;

  useEffect(() => {
    if (!open || !deviceId) return undefined;

    let cancelled = false;
    setPhase('connecting');
    setNeedsTap(false);
    setErrorKey('');

    const fail = (key) => {
      if (cancelled) return;
      setErrorKey(key);
      setPhase('error');
    };

    const timer = setTimeout(() => fail('face3.errTimeout'), CRED_TIMEOUT_MS);

    viewFace3Device(deviceId, (message) => {
      clearTimeout(timer);
      if (cancelled) return;
      if (!message?.success) {
        fail(CRED_ERROR_TEXT[message?.message] || 'face3.errLiveUnknown');
        return;
      }
      viewerRef.current = startFace3Viewer(message.data, {
        onStream: (stream) => {
          if (cancelled) return;
          const el = videoRef.current;
          if (!el) return;
          /* 直接赋 srcObject，不要用 URL.createObjectURL —— 后者已废弃，
             且在部分 WebView 上拿不到画面。 */
          /* 出画与否的判据：videoWidth/Height 非 0 才说明真的解出了帧。
             之前只看到"一个大播放按钮"时无从判断是没起播还是没解码。
             监听器必须**先挂再赋流**，否则 loadedmetadata 可能已经过去了。 */
          el.onloadedmetadata = () => {
            // eslint-disable-next-line no-console
            console.info(
              `[face3Viewer] video ${el.videoWidth}x${el.videoHeight}, tracks=` +
                stream
                  .getTracks()
                  .map((tk) => tk.kind)
                  .join('+')
            );
          };
          /* 同一个流不要重复赋值：重复赋值等于发起新的 load，会把还没完成的
             play() 打断(AbortError)。 */
          if (el.srcObject !== stream) el.srcObject = stream;
          setPhase('playing');
          startFrameProbe(el);

          /* 先尝试带声音自动播放。WebView 已关 mediaPlaybackRequiresUserGesture，
             多数情况能直接出声。被拦住(NotAllowedError)就退回静音自动播放——静音
             播放浏览器一律放行——并提示点击解除静音，点击是真手势可开声音。
             muted 用 el.muted 命令式设置，不用 JSX 的 muted 属性：React 对 video
             的 muted 属性有已知不生效的老 bug。 */
          el.muted = false;
          const p = el.play();
          if (p?.catch) {
            p.catch((err) => {
              if (cancelled) return;
              // eslint-disable-next-line no-console
              console.warn('[face3Viewer] unmuted autoplay blocked:', err?.name || err);
              el.muted = true;
              el.play().catch((e) => {
                if (cancelled) return;
                // eslint-disable-next-line no-console
                console.warn('[face3Viewer] muted autoplay also blocked:', e?.name || e);
              });
              setNeedsTap(true); /* 视频已静音在播，提示点一下开声音 */
            });
          }
        },
        onError: (key) => fail(VIEWER_ERROR_TEXT[key] || 'face3.errLiveUnknown'),
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      /* 必须显式关：不关的话 RTCPeerConnection 和信令 WebSocket 会一直活着，
         反复开关弹窗就会攒下一堆连接，设备侧也会被多个 viewer 占住。 */
      viewerRef.current?.close();
      viewerRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open, deviceId, viewFace3Device, attempt]);

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
      el.requestVideoFrameCallback(onFrame);
    };
    el.requestVideoFrameCallback(onFrame);
  };

  const retry = () => setAttempt((n) => n + 1);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box sx={{ position: 'relative', bgcolor: '#000' }}>
        {/* 16:9 与摄像头出图比例一致，避免出画瞬间跳版 */}
        <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            onClick={() => {
              /* 点击是真手势：解除静音并起播，让用户听到声音。muted 不写成 JSX
                 属性(React 老 bug 不生效)，这里命令式设。失败必须记下来——之前
                 吞掉异常，用户点了没反应而控制台一片空白，线索也一起丢了。 */
              const el = videoRef.current;
              if (!el) return;
              el.muted = false;
              el.play()
                .then(() => setNeedsTap(false))
                .catch((err) => {
                  // eslint-disable-next-line no-console
                  console.warn('[face3Viewer] tap play failed:', err?.name || err);
                });
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: phase === 'playing' ? 'block' : 'none',
            }}
          />

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
              {phase === 'error' ? (
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
                  <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {t('face3.liveConnecting')}
                  </Typography>
                </>
              )}
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
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ px: 2, py: 1.25, bgcolor: 'white' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {device?.displayName || deviceId}
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
