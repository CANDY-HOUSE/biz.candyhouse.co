import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { biz3utils } from '@utils/biz3utils';
import { parseFace3Qr } from '@utils/face3Qr';

/** 兑换请求的超时。与列表一致：sendMessage 断网时是静默丢弃的 */
const REDEEM_TIMEOUT_MS = 15000;

/** 原生扫码的回调函数名。原生会 evaluateJavascript 调 window[这个名字] */
const SCAN_CALLBACK = 'onFace3QrScanned';

/** 云端返回的 message 是稳定的机器码，文案在这里本地化 */
const ERROR_TEXT = {
  invalid_qr_uuid: 'face3.errInvalidQr',
  not_authenticated: 'face3.errNotAuthenticated',
  qr_not_found: 'face3.errNotFound',
  qr_revoked: 'face3.errRevoked',
  qr_already_redeemed: 'face3.errAlreadyRedeemed',
  device_claimed_by_other: 'face3.errClaimedByOther',
  invalid_identity: 'face3.errInvalidIdentity',
};

/**
 * 添加 Face3 设备。
 *
 * 两条路：
 *   · 在 App 里 —— 让原生打开扫码器（triggerBridge），扫完把原文回调过来
 *   · 在浏览器里 —— triggerBridge 返回 false，退回手工粘贴二维码内容
 *
 * 浏览器那条不是凑数的：开发联调和客服排查都用得上，而 H5 自己拿不到摄像头。
 */
export default function Face3AddDevice({ open, onClose, onBound }) {
  const { t } = useTranslation();
  const { gFace3Qr } = useContext(GlobalStateContext);
  const { redeemQr } = gFace3Qr;

  const [state, setState] = useState('idle'); // idle | pending | error
  const [errorKey, setErrorKey] = useState('');
  const [manual, setManual] = useState('');
  const settled = useRef(false);

  /* 拿到二维码原文之后的统一入口，扫码和粘贴都走它 */
  const submit = useCallback(
    (raw) => {
      const parsed = parseFace3Qr(raw);
      if (!parsed.ok) {
        setErrorKey(parsed.reason === 'not_face3' ? 'face3.errNotFace3' : 'face3.errInvalidQr');
        setState('error');
        return;
      }

      settled.current = false;
      setState('pending');
      const timer = setTimeout(() => {
        if (settled.current) return;
        settled.current = true;
        setErrorKey('face3.errTimeout');
        setState('error');
      }, REDEEM_TIMEOUT_MS);

      redeemQr(parsed.qrUUID, (message) => {
        if (settled.current) return;
        settled.current = true;
        clearTimeout(timer);
        if (message?.success) {
          setState('idle');
          setManual('');
          onBound?.(message.data);
        } else {
          setErrorKey(ERROR_TEXT[message?.message] || 'face3.errUnknown');
          setState('error');
        }
      });
    },
    [redeemQr, onBound]
  );

  /* 原生扫完码会调 window[SCAN_CALLBACK]。挂在 window 上是这个桥的约定，
     组件卸载时务必摘掉，否则换页之后回调打到已卸载的组件上。 */
  useEffect(() => {
    if (!open) return undefined;
    window[SCAN_CALLBACK] = (payload) => {
      /* 原生可能给字符串，也可能给 {qr: "..."} —— 两种都收 */
      let raw = payload;
      if (payload && typeof payload === 'object') raw = payload.qr || payload.data || '';
      if (typeof raw === 'string' && raw) submit(raw);
    };
    return () => {
      delete window[SCAN_CALLBACK];
    };
  }, [open, submit]);

  const startScan = () => {
    setState('idle');
    setErrorKey('');
    const sent = biz3utils.triggerBridge({
      action: 'requestScanQRCode',
      callbackName: SCAN_CALLBACK,
    });
    if (!sent) {
      /* 不在 App 里。不静默失败 —— 告诉用户为什么没弹扫码器 */
      setErrorKey('face3.scanNeedsApp');
      setState('error');
    }
  };

  const busy = state === 'pending';

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('face3.addFace3Device')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{t('face3.addFace3DeviceHint')}</DialogContentText>

        {busy ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={22} />
            <Typography variant="body2">{t('face3.binding')}</Typography>
          </Box>
        ) : (
          <>
            <Button fullWidth variant="contained" onClick={startScan} sx={{ mb: 2 }}>
              {t('face3.scanQr')}
            </Button>
            {/* 浏览器里没有摄像头，留一条手工通路给联调和客服 */}
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              label={t('face3.pasteQr')}
              placeholder="ssm://UI?t=qr&qr=..."
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            {state === 'error' && errorKey && (
              <Typography variant="body2" sx={{ mt: 1.5, color: 'error.main' }}>
                {t(errorKey)}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('face3.cancel')}
        </Button>
        <Button onClick={() => submit(manual.trim())} disabled={busy || !manual.trim()}>
          {t('face3.bind')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
