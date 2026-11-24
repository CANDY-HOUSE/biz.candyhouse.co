import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { logOperationFailure } from '@/services/operationFailure';

/* 最多 90 字（云端 Face3_qr TTS_MAX_CHARS 是 100，比这里宽）。合成的 MP3 放在 WebSocket 回包里，
   单条上限 128KB，大小看读多久：普通的日语 / 中文放得下，满是数字（单号、电话）的会超，
   云端回 audio_too_large，提示"内容太长"。 */
export const SPEECH_MAX_CHARS = 90;
const TOO_LONG_REASONS = ['text_too_long', 'audio_too_large'];
/* 按字符计、超出的截掉（emoji 等占两个 UTF-16 单元的也算一个），与云端 [...text].length 一致 */
const limitChars = (value) => {
  const chars = [...value];
  return chars.length > SPEECH_MAX_CHARS ? chars.slice(0, SPEECH_MAX_CHARS).join('') : value;
};

/* 声音性别：默认女声，选过的记在本机（读写失败就按默认，不影响发送） */
const GENDERS = ['female', 'male'];
const GENDER_STORAGE_KEY = 'face3.speech.gender';
const loadGender = () => {
  try {
    const saved = window.localStorage.getItem(GENDER_STORAGE_KEY);
    return GENDERS.includes(saved) ? saved : 'female';
  } catch {
    return 'female';
  }
};
const saveGender = (gender) => {
  try {
    window.localStorage.setItem(GENDER_STORAGE_KEY, gender);
  } catch {
    /* 存不了就只在本次有效 */
  }
};

const base64ToArrayBuffer = (base64) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

/**
 * 实时画面里的"打字说话"：输入文字 → 云端合成语音（Polly）→ 经 KVS 音频轨发给门铃播放。
 *
 * 发送后对话框不关，输入框里的文字保留（可以再发一次或改了再发）；播放中可以停止。
 * 状态（idle | synthesizing | playing）回报给父组件：播放期间合成语音占着音频轨，话筒开关要禁用。
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.deviceUUID
 * @param {{ current: object }} props.viewerRef  观看端句柄（kvsViewer 的 unlockSpeech / playSpeech / stopSpeech）
 * @param {(deviceUUID: string, text: string, lang: string, gender: string, signal: AbortSignal) => Promise<object>} props.synthesize
 * @param {(status: string) => void} [props.onStatusChange]
 * @param {(key: string) => void} props.onFailure  提示失败（i18n key）
 */
export default function Face3SpeechDialog({
  open,
  onClose,
  deviceUUID,
  viewerRef,
  synthesize,
  onStatusChange,
  onFailure,
}) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle');
  const [gender, setGender] = useState(loadGender);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const busy = status !== 'idle';

  const fail = (reason) => {
    logOperationFailure('components/vision/Face3SpeechDialog.send', reason);
    onFailure(TOO_LONG_REASONS.includes(reason) ? 'face3.speech.tooLong' : 'face3.speech.failed');
  };

  const send = async () => {
    const viewer = viewerRef.current;
    const value = text.trim();
    if (!value || status !== 'idle' || !viewer?.playSpeech) return;
    /* 必须在点击回调里同步调用：iOS / WebView 只允许在用户手势里启动 AudioContext */
    viewer.unlockSpeech?.();
    setStatus('synthesizing');
    const controller = new AbortController();
    abortRef.current = controller;
    const response = await synthesize(deviceUUID, value, i18n.language, gender, controller.signal);
    if (!mountedRef.current || controller.signal.aborted) return;
    if (!response?.success || !response.data?.audio) {
      setStatus('idle');
      fail(response?.message || 'no_audio');
      return;
    }
    setStatus('playing');
    try {
      await viewer.playSpeech(base64ToArrayBuffer(response.data.audio));
    } catch (error) {
      if (mountedRef.current) fail(error?.name || error?.message || 'play_failed');
    } finally {
      if (mountedRef.current) setStatus('idle');
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    viewerRef.current?.stopSpeech?.();
    setStatus('idle');
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-label={t('face3.speech.title')}>
      <DialogContent sx={{ pb: 1 }}>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          value={text}
          disabled={busy}
          placeholder={t('face3.speech.placeholder')}
          onChange={(event) => setText(limitChars(event.target.value))}
          onKeyDown={(event) => {
            /* 电脑上回车直接发送，Shift+回车换行；输入法选字时的回车不算 */
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          InputProps={{
            /* 男 / 女声：小号切换，贴在输入框右下角；输入框底部留出一条空，文字用满整行宽、不会被挡 */
            endAdornment: (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={gender}
                disabled={busy}
                onChange={(_, next) => {
                  if (!next) return;
                  setGender(next);
                  saveGender(next);
                }}
                aria-label={t('face3.speech.voice')}
                sx={{ position: 'absolute', right: 6, bottom: 6 }}
              >
                {GENDERS.map((value) => (
                  <ToggleButton key={value} value={value} sx={{ px: 0.75, py: 0.125, fontSize: 12, lineHeight: 1.5 }}>
                    {t(`face3.speech.${value}`)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            ),
          }}
          helperText={`${[...text].length}/${SPEECH_MAX_CHARS}`}
          FormHelperTextProps={{ sx: { textAlign: 'right', mx: 0 } }}
          sx={{ mt: 1, '& .MuiOutlinedInput-root': { pb: '34px' } }}
        />
      </DialogContent>
      {/* 按钮矮一点、整行贴近输入框 */}
      <DialogActions sx={{ pt: 0 }}>
        <Button size="small" onClick={onClose}>
          {t('face3.speech.close')}
        </Button>
        {busy ? (
          <Button
            size="small"
            variant="contained"
            onClick={stop}
            startIcon={<CircularProgress size={14} sx={{ color: 'inherit' }} />}
          >
            {t(status === 'synthesizing' ? 'face3.speech.synthesizing' : 'face3.speech.stop')}
          </Button>
        ) : (
          <Button size="small" variant="contained" onClick={send} disabled={!text.trim()}>
            {t('face3.speech.send')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
