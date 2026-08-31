import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import Face3DeviceList from '@/components/Face3DeviceList';
import { parseFace3QrFromParams } from '@utils/face3Qr';

/** 云端没回话就一直转圈是最糟的状态，给个上限 */
const REDEEM_TIMEOUT_MS = 15000;

/**
 * 云端的 message 映射成给人看的话。
 * 云端的 message 是稳定的机器码（见 Face3_qr.mjs），文案在这里本地化。
 */
const ERROR_TEXT = {
  invalid_qr_uuid: 'face3.errInvalidQr',
  not_authenticated: 'face3.errNotAuthenticated',
  qr_not_found: 'face3.errNotFound',
  qr_revoked: 'face3.errRevoked',
  qr_already_redeemed: 'face3.errAlreadyRedeemed',
  device_claimed_by_other: 'face3.errClaimedByOther',
  invalid_identity: 'face3.errInvalidIdentity',
};

/** 二维码本身就没解开时的原因映射 */
const PARSE_ERROR_TEXT = {
  not_face3: 'face3.errNotFace3',
};

export default function Vision() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { gFace3Qr } = useContext(GlobalStateContext);

  /* 扫码进来时链接上带 qr；从菜单正常进这个页面时不带，保持原样 */
  const parsed = useMemo(() => parseFace3QrFromParams(searchParams), [searchParams]);
  /* 真实的 Cognito Identity ID，原生 App 扫码跳转时挂在 cid 上。
   *
   * 只作记录：绑定的主体仍由已鉴权的连接决定，这里带上是为了让绑定关系里存一个
   * 能在身份池里反查到的值（主体键用的那个是 ANDROID_ID 拼出来的，查不到）。
   * 浏览器里直接打开 /vision 时没有这个参数，属正常，云端会当没带处理。 */
  const cognitoIdentityId = useMemo(() => searchParams.get('cid') || '', [searchParams]);
  const isBindFlow = parsed.ok || parsed.reason !== 'empty';

  const [state, setState] = useState('idle'); // idle | pending | done | error
  const [errorKey, setErrorKey] = useState('');
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  /* 依赖只放基本类型，不放对象。
   *
   * 这里踩过：原本依赖 [parsed, gFace3Qr]，两个都是每次 render 新建的引用，
   * effect 反复重跑 —— 第一次兑换成功，紧跟着的重复请求拿到"已被使用"，
   * 把成功状态覆盖成了错误。绑定其实是成功的，界面却在报错，最难查的那种。
   *
   * redeemQr 是 useCallback([registerCallback])，而 registerCallback 依赖 []，
   * 跨渲染稳定；qrUUID / parseErrorKey 是字符串，天然不会抖。 */
  const { redeemQr } = gFace3Qr;
  const qrUUID = parsed.ok ? parsed.qrUUID : null;
  const parseErrorKey = parsed.ok ? null : PARSE_ERROR_TEXT[parsed.reason] || 'face3.errInvalidQr';

  /* 与列表页同样的第二道防线：按时间节流。
     不能用"在途标志"—— React 会先跑 cleanup 把标志清掉，拦不住依赖抖动。 */
  const lastReqAt = useRef(0);

  useEffect(() => {
    if (!isBindFlow) return undefined;
    if (parseErrorKey) {
      setState('error');
      setErrorKey(parseErrorKey);
      return undefined;
    }
    if (!qrUUID) return undefined;

    const now = Date.now();
    if (now - lastReqAt.current < 1000) return undefined;
    lastReqAt.current = now;

    setState('pending');

    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      fn();
    };

    /* sendMessage 在断网时是静默丢弃、未连接时是入队等待，
       两种情况都不会有回包，所以超时必须由这里兜住 */
    const timer = setTimeout(
      () =>
        finish(() => {
          setState('error');
          setErrorKey('face3.errTimeout');
        }),
      REDEEM_TIMEOUT_MS
    );

    redeemQr(
      qrUUID,
      (message) => {
        finish(() => {
          clearTimeout(timer);
          if (message?.success) {
            /* alreadyBound：这张码本来就是这个人绑的，不必再看一遍成功页，
             直接进设备列表 —— 重复扫码多半就是想确认设备在不在。 */
            if (message.data?.alreadyBound) {
              setState('listing');
              return;
            }
            setResult(message.data);
            setState('done');
          } else {
            setState('error');
            setErrorKey(ERROR_TEXT[message?.message] || 'face3.errUnknown');
          }
        });
      },
      cognitoIdentityId
    );

    return () => clearTimeout(timer);
    // attempt 变化 = 用户点了重试
  }, [isBindFlow, qrUUID, parseErrorKey, redeemQr, attempt, cognitoIdentityId]);

  const frame = (children) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minHeight: '60vh',
        px: 3,
        textAlign: 'center',
      }}
    >
      {children}
    </Box>
  );

  /* 没有 qr 参数：正常进入这个页面，展示已绑定的 Face3 */
  if (!isBindFlow) {
    return <Face3DeviceList />;
  }

  if (state === 'pending' || state === 'idle') {
    return frame(
      <>
        <CircularProgress />
        <Typography variant="h4">{t('face3.binding')}</Typography>
      </>
    );
  }

  if (state === 'listing') {
    return <Face3DeviceList />;
  }

  if (state === 'done') {
    const roleText = result?.role ? t(`deviceMember.role.${result.role}`) : '';
    return frame(
      <>
        <CheckCircleOutlineIcon sx={{ fontSize: 72, color: 'success.main' }} />
        <Typography variant="h3">{t('face3.success')}</Typography>
        {roleText && <Typography variant="body1">{t('face3.boundAs', { role: roleText })}</Typography>}
        <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
          {t('face3.deviceId')}: {result?.deviceId || parsed.did}
        </Typography>
        {/* 绑定成功后给个去处，不然用户停在这一页不知道下一步 */}
        <Button variant="outlined" onClick={() => setState('listing')} sx={{ mt: 2 }}>
          {t('face3.viewFace3Devices')}
        </Button>
      </>
    );
  }

  /* 只有"没解开的码"和"设备被别人绑了"重试也没用，其余都值得再试一次 */
  const retryable =
    errorKey !== 'face3.errInvalidQr' &&
    errorKey !== 'face3.errNotFace3' &&
    errorKey !== 'face3.errClaimedByOther' &&
    errorKey !== 'face3.errAlreadyRedeemed' &&
    errorKey !== 'face3.errRevoked' &&
    errorKey !== 'face3.errNotFound';

  return frame(
    <>
      <ErrorOutlineIcon sx={{ fontSize: 72, color: 'error.main' }} />
      <Typography variant="body1">{t(errorKey)}</Typography>
      {retryable && (
        <Button variant="contained" onClick={() => setAttempt((n) => n + 1)} sx={{ mt: 1 }}>
          {t('face3.retry')}
        </Button>
      )}
    </>
  );
}
