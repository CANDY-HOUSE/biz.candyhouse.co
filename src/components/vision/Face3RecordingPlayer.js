import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Slider, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';

/* ── 录像的声音：设备另存的 G.711A WAV（与 mp4 同名），跟着视频播 ─────────────── */

/** Convert the device's G.711 A-law WAV to PCM WAV for native audio fallback. */
function alawWavToPcm(buffer) {
  const view = new DataView(buffer);
  const tag = (offset) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
  if (buffer.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('invalid_wav');
  let format;
  let data;
  for (let offset = 12; offset + 8 <= buffer.byteLength; ) {
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size > buffer.byteLength) throw new Error('truncated_wav');
    if (tag(offset) === 'fmt ' && size >= 16) {
      format = {
        codec: view.getUint16(start, true),
        channels: view.getUint16(start + 2, true),
        rate: view.getUint32(start + 4, true),
        bits: view.getUint16(start + 14, true),
      };
    }
    if (tag(offset) === 'data') data = new Uint8Array(buffer, start, size);
    offset = start + size + (size & 1);
  }
  if (!format || !data || format.codec !== 6 || format.bits !== 8 || format.channels !== 1 || !format.rate) {
    throw new Error('unsupported_wav');
  }
  const result = new ArrayBuffer(44 + data.length * 2);
  const out = new DataView(result);
  const writeTag = (offset, text) => [...text].forEach((c, i) => out.setUint8(offset + i, c.charCodeAt(0)));
  writeTag(0, 'RIFF');
  out.setUint32(4, result.byteLength - 8, true);
  writeTag(8, 'WAVE');
  writeTag(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, format.rate, true);
  out.setUint32(28, format.rate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  writeTag(36, 'data');
  out.setUint32(40, data.length * 2, true);
  data.forEach((byte, i) => {
    const a = byte ^ 0x55;
    const segment = (a & 0x70) >> 4;
    let sample = (a & 0x0f) << 4;
    if (segment === 0) sample += 8;
    else {
      sample += 0x108;
      if (segment > 1) sample <<= segment - 1;
    }
    out.setInt16(44 + i * 2, a & 0x80 ? sample : -sample, true);
  });
  return result;
}

/** Video owns the clock, playback controls, rate and volume. */
function syncRecordingAudio(video, audio, onBlocked = () => {}) {
  let disposed = false;
  let waiting = false;
  let playPending = false;
  const align = (force = false) => {
    if (!audio.readyState) return;
    const time = Number.isFinite(audio.duration) ? Math.min(video.currentTime, audio.duration) : video.currentTime;
    if (Math.abs(audio.currentTime - time) > (force ? 0.01 : 0.15)) audio.currentTime = time;
    audio.playbackRate = video.playbackRate;
    audio.muted = video.muted;
    audio.volume = video.volume;
  };
  const play = () => {
    align(true);
    if (disposed || waiting || video.paused || video.ended || video.seeking || playPending) return;
    if (Number.isFinite(audio.duration) && video.currentTime >= audio.duration) return;
    playPending = true;
    Promise.resolve(audio.play())
      .then(() => {
        if (disposed || waiting || video.paused || video.ended || video.seeking) audio.pause();
        else onBlocked(false);
      })
      .catch((err) => {
        if (!disposed && err?.name === 'NotAllowedError') onBlocked(true);
      })
      .finally(() => {
        playPending = false;
      });
  };
  const pause = () => audio.pause();
  const handlers = {
    play: () => {
      waiting = false;
      play();
    },
    playing: () => {
      waiting = false;
      play();
    },
    pause,
    ended: pause,
    waiting: () => {
      waiting = true;
      pause();
    },
    seeking: () => {
      pause();
      align(true);
    },
    seeked: () => {
      align(true);
      play();
    },
    ratechange: () => align(),
    volumechange: () => align(),
    timeupdate: () => align(),
  };
  Object.entries(handlers).forEach(([event, fn]) => video.addEventListener(event, fn));
  audio.addEventListener('canplay', play);
  const timer = setInterval(() => {
    if (!video.paused && !waiting && !video.seeking) align();
  }, 200);
  return {
    play,
    dispose() {
      disposed = true;
      clearInterval(timer);
      Object.entries(handlers).forEach(([event, fn]) => video.removeEventListener(event, fn));
      audio.removeEventListener('canplay', play);
      audio.pause();
    },
  };
}

const formatClock = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * 录像播放（就地播放）：铺满父容器 —— 详情页那块 16:9 画面框。
 *
 * 不用系统自带的视频控件：点画面暂停 / 继续，暂停时正中显示 ▶；底部只有时间和进度条，
 * 不提供全屏（部分 APP 壳里系统控件的全屏按钮藏不掉，所以自己画）。放完调用 onEnded。
 * 声音仍由 syncRecordingAudio 跟着视频走：视频的 play / pause / seek 都会带上音频。
 */
export default function Face3RecordingPlayer({ media, label, onRetry, onEnded }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const syncRef = useRef(null);
  /* 声音的问题：null 正常；'blocked' 自动播放被拦（显示「开启声音」）；'error' 放不了（显示提示，不可恢复） */
  const [audioIssue, setAudioIssue] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [paused, setPaused] = useState(true);
  /* 进度和总时长一起显示，放一个 state */
  const [progress, setProgress] = useState({ time: 0, duration: 0 });
  const { time, duration } = progress;

  /* 视频、声音的地址都在这里设、在清理里撤，两边对称。
     视频地址不能写在 JSX 的 src 上：开发模式的 StrictMode 会"挂上 → 清理 → 再挂上"，
     清理把 src 撤掉后 React 不会补回（prop 没变），画面就一直停在 0:00。 */
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return undefined;
    video.src = media.mp4;
    const releaseVideo = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
    if (!media.wav || !audio) return releaseVideo;
    let cancelled = false;
    let fallbackStarted = false;
    let blobUrl;
    const controller = new AbortController();
    /* 被拦 / 恢复只在没出错时切换；出错是终态 */
    const onBlocked = (blocked) => setAudioIssue((issue) => (issue === 'error' ? issue : blocked ? 'blocked' : null));
    const sync = syncRecordingAudio(video, audio, onBlocked);
    syncRef.current = sync;
    const fallback = async () => {
      if (fallbackStarted) {
        setAudioIssue('error');
        return;
      }
      fallbackStarted = true;
      try {
        /* 不走缓存：<audio> 刚取过同一地址，缓存里那份不带跨域头，fetch 读到会被 CORS 拦下 */
        const response = await fetch(media.wav, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('audio_download_failed');
        const pcm = alawWavToPcm(await response.arrayBuffer());
        if (cancelled) return;
        blobUrl = URL.createObjectURL(new Blob([pcm], { type: 'audio/wav' }));
        audio.src = blobUrl;
        audio.load();
      } catch (err) {
        if (!cancelled) setAudioIssue('error');
      }
    };
    audio.addEventListener('error', fallback);
    // Install listeners before setting src: cached resources can fail immediately.
    audio.src = media.wav;
    audio.load();
    return () => {
      cancelled = true;
      controller.abort();
      sync.dispose();
      syncRef.current = null;
      audio.removeEventListener('error', fallback);
      releaseVideo();
      audio.removeAttribute('src');
      audio.load();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [media]);

  /* 选中录像后直接起播；被浏览器拦下（WebView 要求手势）就停在暂停态，点一下画面再播。 */
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, [media]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video || videoError) return;
    if (video.paused || video.ended) video.play().catch(() => {});
    else video.pause();
  };

  const seek = (_, value) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setProgress((current) => ({ ...current, time: value }));
  };

  return (
    <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#000', overflow: 'hidden' }}>
      <Box
        component="video"
        ref={videoRef}
        playsInline
        preload="auto"
        onClick={toggle}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onTimeUpdate={(event) => {
          const { currentTime } = event.currentTarget;
          setProgress((current) => ({ ...current, time: currentTime }));
        }}
        onDurationChange={(event) => {
          const value = event.currentTarget.duration;
          setProgress((current) => ({ ...current, duration: Number.isFinite(value) ? value : 0 }));
        }}
        onEnded={() => onEnded?.()}
        onError={() => setVideoError(true)}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          bgcolor: 'black',
          cursor: 'pointer',
        }}
      />
      {media.wav && <audio ref={audioRef} preload="auto" />}

      {label && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'rgba(0,0,0,0.55)',
            color: 'white',
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
          }}
        >
          {label}
        </Typography>
      )}

      {/* 暂停时正中显示 ▶。点击穿透到视频，由视频统一处理暂停 / 继续。 */}
      {paused && !videoError && (
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
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'rgba(0,0,0,0.55)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayArrowIcon fontSize="large" />
          </Box>
        </Box>
      )}

      {audioIssue === 'blocked' && (
        <Button
          size="small"
          variant="contained"
          onClick={() => syncRef.current?.play()}
          sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.55)', color: 'white' }}
        >
          {t('face3.recordings.enableAudio')}
        </Button>
      )}
      {audioIssue === 'error' && (
        <Alert
          severity="warning"
          sx={{ position: 'absolute', top: 36, left: 8, right: 8, py: 0, fontSize: '0.75rem', pointerEvents: 'none' }}
        >
          {t('face3.recordings.audioError')}
        </Alert>
      )}

      {/* 底部：时间 + 进度条，可拖动定位 */}
      {!videoError && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            bgcolor: 'rgba(0,0,0,0.45)',
            color: 'white',
          }}
        >
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {formatClock(time)} / {formatClock(duration)}
          </Typography>
          <Slider
            size="small"
            aria-label={t('face3.recordings.seek')}
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            disabled={!duration}
            onChange={seek}
            sx={{ flex: 1, color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)' } }}
          />
        </Box>
      )}

      {videoError && (
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
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            {t('face3.recordings.playError')}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            {t('face3.retry')}
          </Button>
        </Box>
      )}
    </Box>
  );
}
