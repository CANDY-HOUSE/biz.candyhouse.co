import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { alawWavToPcm, syncRecordingAudio } from '@/utils/eventRecordingAudio';

export default function Face3RecordingPlayer({ media, onRetry }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const syncRef = useRef(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [videoError, setVideoError] = useState(false);

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

  return (
    <Box>
      <Box
        component="video"
        ref={videoRef}
        src={media.mp4}
        controls
        playsInline
        preload="metadata"
        onError={() => setVideoError(true)}
        sx={{ display: 'block', width: '100%', maxHeight: '50vh', bgcolor: 'black' }}
      />
      {media.wav && <audio ref={audioRef} preload="auto" />}
      {audioBlocked && !audioError && (
        <Button onClick={() => syncRef.current?.play()}>{t('face3.recordings.enableAudio')}</Button>
      )}
      {audioError && <Alert severity="warning">{t('face3.recordings.audioError')}</Alert>}
      {videoError && (
        <Alert severity="error" action={<Button onClick={onRetry}>{t('face3.retry')}</Button>}>
          {t('face3.recordings.playError')}
        </Alert>
      )}
    </Box>
  );
}
