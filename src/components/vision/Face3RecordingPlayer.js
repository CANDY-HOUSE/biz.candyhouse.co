import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Slider, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { alawWavToPcm, syncRecordingAudio } from './eventRecordingAudio';

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
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!media.wav || !video || !audio) {
      return () => {
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    }
    let cancelled = false;
    let fallbackStarted = false;
    let blobUrl;
    const controller = new AbortController();
    const sync = syncRecordingAudio(video, audio, setAudioBlocked);
    syncRef.current = sync;
    const fallback = async () => {
      if (fallbackStarted) {
        setAudioError(true);
        return;
      }
      fallbackStarted = true;
      try {
        const response = await fetch(media.wav, { signal: controller.signal });
        if (!response.ok) throw new Error('audio_download_failed');
        const pcm = alawWavToPcm(await response.arrayBuffer());
        if (cancelled) return;
        blobUrl = URL.createObjectURL(new Blob([pcm], { type: 'audio/wav' }));
        audio.src = blobUrl;
        audio.load();
      } catch (err) {
        if (!cancelled) setAudioError(true);
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
      video.pause();
      video.removeAttribute('src');
      video.load();
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
    setTime(value);
  };

  return (
    <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#000', overflow: 'hidden' }}>
      <Box
        component="video"
        ref={videoRef}
        src={media.mp4}
        playsInline
        preload="auto"
        onClick={toggle}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => {
          const value = event.currentTarget.duration;
          setDuration(Number.isFinite(value) ? value : 0);
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

      {audioBlocked && !audioError && (
        <Button
          size="small"
          variant="contained"
          onClick={() => syncRef.current?.play()}
          sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.55)', color: 'white' }}
        >
          {t('face3.recordings.enableAudio')}
        </Button>
      )}
      {audioError && (
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
