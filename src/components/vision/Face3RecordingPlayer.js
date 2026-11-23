import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Slider, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';

const formatClock = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * 录像播放（就地播放）：铺满父容器 —— 详情页那块 16:9 画面框。
 *
 * 不用系统自带的视频控件：点画面暂停 / 继续，暂停时正中显示 ▶；底部只有时间和进度条，
 * 不提供全屏（部分 APP 壳里系统控件的全屏按钮藏不掉，所以自己画）。放完调用 onEnded。
 * 声音就是 MP4 自带的音轨（固件把声音直接录进 MP4），不再另外取旁路 WAV。
 */
export default function Face3RecordingPlayer({ media, label, onRetry, onEnded }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [paused, setPaused] = useState(true);
  /* 进度和总时长一起显示，放一个 state */
  const [progress, setProgress] = useState({ time: 0, duration: 0 });
  const { time, duration } = progress;

  /* 视频地址在这里设、在清理里撤。
     视频地址不能写在 JSX 的 src 上：开发模式的 StrictMode 会"挂上 → 清理 → 再挂上"，
     清理把 src 撤掉后 React 不会补回（prop 没变），画面就一直停在 0:00。 */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    video.src = media.mp4;
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
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
