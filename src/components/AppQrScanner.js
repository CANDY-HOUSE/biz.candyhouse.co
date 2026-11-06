import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Box, ButtonBase, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { Decoder } from '@nuintun/qrcode';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import useAppLayer from '@/hooks/useAppLayer';
import { onNativeEvent } from '@/services/appBridge';
import { appQrScanner } from '@/services/appQrScanner';
import { AlbumIcon, CloseIcon } from './appIcons';

const accent = '#28aeb1';
const boxSize = 240;
const tipMargin = 24;
// Transform runs on the compositor, so the line stays smooth while frames are decoded on the main thread.
const scanLine = keyframes`from { transform: translateY(0); } to { transform: translateY(${boxSize - 2}px); }`;
// Frames are decoded at this width at most; enough for phone screens and printed codes.
const decodeWidth = 720;

/** Full-screen QR scanner: the camera stream and photo picker come from the system, everything else is the page. */
function Scanner() {
  const { t } = useTranslation();
  const { setSnackbarValue } = useContext(GlobalStateContext);
  const video = useRef(null);
  const preview = useRef(null);
  const file = useRef(null);
  const done = useRef(false);
  const finish = (value, error) => {
    if (done.current) return;
    done.current = true;
    appQrScanner.finish(value, error);
  };
  useAppLayer(true, () => finish(null));
  useEffect(() => {
    let stream;
    let timer;
    let active = true;
    let paused = false;
    let attempt = 0;
    const decoder = new Decoder();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const target = preview.current;
    const previewContext = target.getContext('2d');
    let frameRequest;
    let frameTime = -1;
    const stop = () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameRequest);
      frameTime = -1;
      previewContext.clearRect(0, 0, target.width, target.height);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };
    // WebKit draws the first camera frames of a <video> at the stream's natural size before scaling them to the
    // element, so the hidden video only feeds this canvas, which is always drawn to cover the screen.
    const draw = () => {
      const view = video.current;
      if (!active || paused || !view) return;
      if (view.readyState >= 2 && view.videoWidth && view.currentTime !== frameTime) {
        frameTime = view.currentTime;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.round(target.clientWidth * ratio);
        const height = Math.round(target.clientHeight * ratio);
        if (target.width !== width) target.width = width;
        if (target.height !== height) target.height = height;
        const scale = Math.max(width / view.videoWidth, height / view.videoHeight);
        const drawWidth = view.videoWidth * scale;
        const drawHeight = view.videoHeight * scale;
        previewContext.drawImage(view, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      }
      frameRequest = requestAnimationFrame(draw);
    };
    const scan = () => {
      const view = video.current;
      if (!active || paused || !view) return;
      if (view.readyState >= 2 && view.videoWidth) {
        const scale = Math.min(1, decodeWidth / view.videoWidth);
        canvas.width = Math.round(view.videoWidth * scale);
        canvas.height = Math.round(view.videoHeight * scale);
        context.drawImage(view, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = decoder.decode(frame.data, frame.width, frame.height);
        if (result?.data) {
          stop();
          finish(result.data);
          return;
        }
      }
      timer = setTimeout(scan, 150);
    };
    // A permission prompt pauses and resumes the page, so an earlier request may still resolve after a newer one.
    const start = async () => {
      const current = ++attempt;
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active || paused || current !== attempt) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        video.current.srcObject = media;
        await video.current.play().catch(() => {});
        draw();
        scan();
      } catch (error) {
        if (active && !paused && current === attempt)
          finish(null, new Error(error?.name === 'NotAllowedError' ? 'Permission denied' : 'Unable to open camera'));
      }
    };
    // Release the camera while the app is in the background, as the native scanner did.
    const pause = () => {
      if (paused) return;
      paused = true;
      stop();
    };
    const resume = () => {
      if (!paused || !active) return;
      paused = false;
      start();
    };
    const visibility = () => (document.hidden ? pause() : resume());
    const off = onNativeEvent(({ type }) => {
      if (type === 'pause') pause();
      else if (type === 'resume') resume();
    });
    document.addEventListener('visibilitychange', visibility);
    start();
    return () => {
      active = false;
      off();
      document.removeEventListener('visibilitychange', visibility);
      stop();
    };
  }, []);
  const pickImage = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image) return;
    const url = URL.createObjectURL(image);
    try {
      const result = await new Decoder().scan(url);
      if (!result?.data) throw new Error('No QR code found');
      finish(result.data);
    } catch (_) {
      setSnackbarValue({ open: true, msg: t('appHome.qrNotFound'), severity: 'warning' });
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const control = { position: 'absolute', width: 80, height: 80, p: '22px' };
  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1350, bgcolor: '#000', overflow: 'hidden', userSelect: 'none' }}>
      <Box
        component="video"
        ref={video}
        muted
        playsInline
        autoPlay
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, pointerEvents: 'none' }}
      />
      <Box component="canvas" ref={preview} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: boxSize,
          height: boxSize,
          transform: 'translate(-50%, -50%)',
          border: '0.5px solid #eeeeee',
          boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.4)',
        }}
      >
        {[
          { top: -1.5, left: -1.5, borderTopWidth: 3, borderLeftWidth: 3 },
          { top: -1.5, right: -1.5, borderTopWidth: 3, borderRightWidth: 3 },
          { bottom: -1.5, left: -1.5, borderBottomWidth: 3, borderLeftWidth: 3 },
          { bottom: -1.5, right: -1.5, borderBottomWidth: 3, borderRightWidth: 3 },
        ].map((corner, index) => (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              width: 20,
              height: 20,
              borderColor: accent,
              borderStyle: 'solid',
              borderWidth: 0,
              ...corner,
            }}
          />
        ))}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            willChange: 'transform',
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            animation: `${scanLine} 1s linear infinite`,
          }}
        />
      </Box>
      <Typography
        noWrap
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `calc(50% + ${boxSize / 2 + tipMargin}px)`,
          textAlign: 'center',
          color: '#fff',
          fontSize: 14,
          lineHeight: '20px',
        }}
      >
        {t('appHome.scanQrCode')}
      </Typography>
      <ButtonBase
        disableRipple
        aria-label={t('appHome.gallery')}
        onClick={() => file.current?.click()}
        sx={{ ...control, left: '50%', ml: '-40px', top: `calc(50% + ${boxSize / 2 + tipMargin + 20 + 8}px)` }}
      >
        <AlbumIcon size={36} />
      </ButtonBase>
      <ButtonBase
        disableRipple
        aria-label={t('appHome.close')}
        onClick={() => finish(null)}
        sx={{ ...control, top: 0, right: 0 }}
      >
        <CloseIcon size={36} />
      </ButtonBase>
      <input ref={file} type="file" accept="image/*" hidden onChange={pickImage} />
    </Box>
  );
}

export default function AppQrScanner() {
  const open = useSyncExternalStore(appQrScanner.subscribe, appQrScanner.getSnapshot);
  return open ? createPortal(<Scanner />, document.body) : null;
}
