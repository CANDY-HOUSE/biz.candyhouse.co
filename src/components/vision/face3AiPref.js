import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { isGuestAppSession } from '@/services/appSession';
import { gConfig } from '@constants/gConfig';

/* AI 开关按设备只记在本机（与 Face3LiveView 的扬声器偏好同样的做法）。
   暂时也用它选实时画面的协议：开 → LiveKit，关 → KVS 直连（见 ./protocols）。
   localStorage 在无痕/禁用存储时会抛，读不到就当关。 */
const aiPrefKey = (deviceUUID) => `face3.ai.${String(deviceUUID || '').toUpperCase()}`;
const loadAiPref = (deviceUUID) => {
  try {
    return localStorage.getItem(aiPrefKey(deviceUUID)) === '1';
  } catch (_) {
    return false;
  }
};
const saveAiPref = (deviceUUID, enabled) => {
  try {
    if (enabled) localStorage.setItem(aiPrefKey(deviceUUID), '1');
    else localStorage.removeItem(aiPrefKey(deviceUUID));
  } catch (_) {
    /* 存不下就只在本次页面内生效 */
  }
};

/**
 * Face3 的 AI 开关。首页卡片用它选实时画面的协议，详情页用它显示和切换开关。
 *
 * 登录态 = 已拿到登录用户信息且不是 APP 访客会话：PC 只能登录后进来；
 * APP 访客的 customerInfo.isAnonymous 为 true。未登录时一律显示关，开启时提示登录。
 */
export function useFace3Ai() {
  const { t } = useTranslation();
  const { gAuth, gStripe, setSnackbarValue } = useContext(GlobalStateContext);
  const signedIn =
    gAuth.loginState !== gConfig.loginState.loginOut &&
    !isGuestAppSession() &&
    Boolean(gStripe.customerInfo.subUUID) &&
    gStripe.customerInfo.isAnonymous !== true;
  /* 本次页面内切换过的设备 -> 开关值；没切换过的读本机存储 */
  const [aiPrefs, setAiPrefs] = useState({});

  const isAiOn = (deviceUUID) => {
    if (!signedIn || !deviceUUID) return false;
    const id = deviceUUID.toUpperCase();
    return id in aiPrefs ? aiPrefs[id] : loadAiPref(id);
  };

  const toggleAi = (device, enabled) => {
    if (enabled && !signedIn) {
      setSnackbarValue({ open: true, severity: 'info', msg: t('face3.ai.loginRequired') });
      return;
    }
    const id = device.deviceUUID.toUpperCase();
    saveAiPref(id, enabled);
    setAiPrefs((prefs) => ({ ...prefs, [id]: enabled }));
  };

  return { isAiOn, toggleAi };
}
