import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box } from '@mui/material';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { isGuestAppSession } from '@/services/appSession';
import { gConfig } from '@constants/gConfig';
import Face3LiveView from './Face3LiveView';

/**
 * Vision（Face3）的共享环境：挂在路由之外（App 里包住页面），Vision 各组件从 useFace3Context() 取。
 *
 * ── 为什么不直接用全局 GlobalStateContext ──
 * 它的值每次渲染都是新对象：任何全局状态一变（提示条、设备列表、其他设备的推送……），
 * 订阅它的组件全部重渲。这里订阅一次，只把 Face3 用得到的东西放进一个 useMemo 的值里，
 * 只有这些东西变了，Vision 组件才跟着重渲。
 *
 * ── 实时画面会话 ──
 * Vision 首页正在看的那台，点进它的详情页时连接不断、直接带入。两个页面是不同的路由，
 * 换页时首页整个卸载；Face3LiveView 若放在页面里，连接就跟着关了。所以由这里渲染
 * Face3LiveView（同一时刻一路），渲染进一个常驻的 hostEl；页面只放一个"槽位"（Face3LiveSlot），
 * 把 hostEl 挂进自己的画面框。
 *
 * 什么时候结束：会话记着自己是在哪个页面（pathname）开的。离开那个页面就停 —— 包括从详情页
 * 返回首页、去别的页面；唯一例外是"从首页进入这台的详情页"（首页跳转时带上 carryFace3Live 的
 * location.state），这时带入，页面记为详情页。同一页面内只改查询参数（pathname 不变）不算换页。
 * 按"开播的页面"而不是"上一个页面"判断：门铃推送从别的页面跳到 /vision?live=1 时，
 * 首页挂载就开播（列表已在内存里），和这次换页在同一次渲染里 —— 若按"换页了就停"，
 * 刚开的画面会被立刻关掉。
 *
 * ── AI 开关 ──
 * 按设备只记在本机（与扬声器偏好同样的做法），首页和详情页共用这里的一份。
 * 暂时也用它选实时画面的协议：开 → LiveKit，关 → KVS 直连（见 ./protocols）。
 * 登录态 = 已拿到登录用户信息且不是 APP 访客会话；未登录时一律显示关，开启时提示登录。
 */
const CARRY_STATE_KEY = 'carryFace3Live';

/** 首页跳到详情页时作为 navigate 的 state：这台正在看就带入详情页，不断开 */
export const carryFace3Live = (deviceUUID) => ({ [CARRY_STATE_KEY]: String(deviceUUID || '').toUpperCase() });

/* localStorage 在无痕/禁用存储时会抛，读不到就当关；存不下就只在本次页面内生效 */
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
    /* 只在本次页面内生效 */
  }
};

const Face3Context = createContext(null);

export function Face3Provider({ children }) {
  const { t } = useTranslation();
  const { gFace3, gAuth, gStripe, setSnackbarValue } = useContext(GlobalStateContext);
  const {
    face3Devices,
    face3StreamStates,
    face3StreamReasons,
    listFace3Devices,
    listFace3Recordings,
    playFace3Recording,
    deleteFace3Recording,
    wakeFace3Device,
    viewFace3Device,
  } = gFace3;

  /* ── AI 开关 ── */
  const signedIn =
    gAuth.loginState !== gConfig.loginState.loginOut &&
    !isGuestAppSession() &&
    Boolean(gStripe.customerInfo.subUUID) &&
    gStripe.customerInfo.isAnonymous !== true;
  /* 本次页面内切换过的设备 -> 开关值；没切换过的读本机存储 */
  const [aiPrefs, setAiPrefs] = useState({});
  const isAiOn = useCallback(
    (deviceUUID) => {
      if (!signedIn || !deviceUUID) return false;
      const id = deviceUUID.toUpperCase();
      return id in aiPrefs ? aiPrefs[id] : loadAiPref(id);
    },
    [signedIn, aiPrefs]
  );
  /** 返回是否真的切换了（未登录时开启会被拦下、只提示登录） */
  const toggleAi = useCallback(
    (device, enabled) => {
      if (enabled && !signedIn) {
        setSnackbarValue({ open: true, severity: 'info', msg: t('face3.ai.loginRequired') });
        return false;
      }
      const id = device.deviceUUID.toUpperCase();
      saveAiPref(id, enabled);
      setAiPrefs((prefs) => ({ ...prefs, [id]: enabled }));
      return true;
    },
    [signedIn, setSnackbarValue, t]
  );

  /* ── 实时画面会话 ── */
  const [session, setSession] = useState(null); // { id, device, protocol, path, startedAt }
  /* 当前会话的画面阶段（connecting | playing | error | ended），由 Face3LiveView 回报；
     按会话编号存，换了会话旧的回报不算数 */
  const [livePhase, setLivePhase] = useState({ id: 0, phase: 'connecting' });
  /* 本次会话点击到「首次」出画（或首次出错）的耗时，毫秒。之后断线重连再出画不覆盖（失败后重试出画除外） */
  const [liveWait, setLiveWait] = useState({ id: 0, ms: 0, ok: false });
  const [toolsTarget, setToolsTarget] = useState(null);
  const sessionRef = useRef(null); // seq：会话编号；hostEl：常驻的画面容器
  if (!sessionRef.current) {
    const hostEl = document.createElement('div');
    hostEl.style.cssText = 'position:absolute;inset:0;';
    sessionRef.current = { seq: 0, hostEl, pathname: '' };
  }
  const { hostEl } = sessionRef.current;

  const stop = useCallback(() => setSession(null), []);

  /* 当前页面。渲染时就更新（而不是放进 effect）：页面在挂载的 effect 里调 start 时，
     要拿到的是这次的新页面，子组件的 effect 比这里的 effect 先跑 */
  const location = useLocation();
  sessionRef.current.pathname = location.pathname;

  /* 换页：还在开播的页面就留着；带着这台的 carry 标记进详情页就带入；否则结束 */
  useEffect(() => {
    const carried = location.state?.[CARRY_STATE_KEY];
    setSession((current) => {
      if (!current || current.path === location.pathname) return current;
      if (carried && current.device.deviceUUID.toUpperCase() === carried) {
        return { ...current, path: location.pathname };
      }
      return null;
    });
  }, [location]);

  /** 开始看这台（记下在哪个页面开的）。已经在看同一台就沿用当前连接（只更新设备信息和协议）。 */
  const start = useCallback((device, protocol) => {
    const path = sessionRef.current.pathname;
    setSession((current) =>
      current && current.device.deviceUUID.toUpperCase() === device.deviceUUID.toUpperCase()
        ? { ...current, device, protocol, path }
        : /* startedAt：点「观看实时画面」的时刻，详情页据此显示等待计时（毫秒） */
          { id: ++sessionRef.current.seq, device, protocol, path, startedAt: performance.now() }
    );
  }, []);

  /** 看的过程中换协议（切了 AI 开关）：Face3LiveView 会按新协议重连 */
  const setProtocol = useCallback(
    (protocol) =>
      setSession((current) => (current && current.protocol !== protocol ? { ...current, protocol } : current)),
    []
  );

  /** 槽位挂上 hostEl；返回摘下的函数。停不停由上面的换页规则决定，这里只管挂 / 摘 */
  const attach = useCallback(
    (slotEl) => {
      slotEl.appendChild(hostEl);
      /* 媒体元素离开文档会被浏览器暂停（详情页是懒加载的，挂上前有一小段空档），挂回来补一次 play */
      hostEl.querySelectorAll('video').forEach((video) => {
        if (video.srcObject && video.paused) video.play().catch(() => {});
      });
      return () => {
        if (hostEl.parentNode === slotEl) slotEl.removeChild(hostEl);
      };
    },
    [hostEl]
  );

  const liveUUID = session?.device?.deviceUUID?.toUpperCase() || '';
  const sessionId = session?.id || 0;
  const sessionStartedAt = session?.startedAt || 0;
  const onLivePhase = useCallback(
    (phase) => {
      setLivePhase({ id: sessionId, phase });
      if ((phase === 'playing' || phase === 'error') && sessionStartedAt) {
        const ms = Math.round(performance.now() - sessionStartedAt);
        /* 首次定格后不覆盖，唯一例外：先失败、用户点画面里的重试（同一会话重连）后出画了 ——
           改成成功、耗时从点击算起，否则画面明明出来了标签还显示「未能出画」 */
        setLiveWait((cur) =>
          cur.id === sessionId && (cur.ok || phase === 'error') ? cur : { id: sessionId, ms, ok: phase === 'playing' }
        );
        /* 点击到出画的耗时，排查唤醒/建连慢时看这一行 */
        console.info(`[face3] click-to-${phase === 'playing' ? 'picture' : 'error'} ${ms} ms`);
      }
    },
    [sessionId, sessionStartedAt]
  );
  const currentLivePhase = livePhase.id === sessionId ? livePhase.phase : 'connecting';
  const currentLiveWait = liveWait.id === sessionId ? liveWait : null;
  const value = useMemo(
    () => ({
      devices: face3Devices || [],
      listFace3Devices,
      listFace3Recordings,
      playFace3Recording,
      deleteFace3Recording,
      notify: setSnackbarValue,
      isAiOn,
      toggleAi,
      liveUUID,
      liveStartedAt: sessionStartedAt,
      livePhase: currentLivePhase,
      liveWait: currentLiveWait,
      start,
      stop,
      setProtocol,
      setToolsTarget,
      attach,
    }),
    [
      face3Devices,
      listFace3Devices,
      listFace3Recordings,
      playFace3Recording,
      deleteFace3Recording,
      setSnackbarValue,
      isAiOn,
      toggleAi,
      liveUUID,
      sessionStartedAt,
      currentLivePhase,
      currentLiveWait,
      start,
      stop,
      setProtocol,
      attach,
    ]
  );

  const liveDeviceUUID = session?.device?.deviceUUID;
  return (
    <Face3Context.Provider value={value}>
      {children}
      {session &&
        createPortal(
          <Face3LiveView
            key={session.id}
            device={session.device}
            protocol={session.protocol}
            onClose={stop}
            onPhaseChange={onLivePhase}
            label="LIVE"
            toolsTarget={toolsTarget}
            streamState={face3StreamStates?.[liveDeviceUUID]}
            streamReason={face3StreamReasons?.[liveDeviceUUID]}
            wakeFace3Device={wakeFace3Device}
            viewFace3Device={viewFace3Device}
            setSnackbarValue={setSnackbarValue}
          />,
          hostEl
        )}
    </Face3Context.Provider>
  );
}

/**
 * {
 *   devices, listFace3Devices, listFace3Recordings, playFace3Recording, deleteFace3Recording,
 *   notify(snackbarValue), isAiOn(deviceUUID), toggleAi(device, enabled),
 *   liveUUID, liveStartedAt, livePhase, liveWait（{ms, ok}：首次出画/出错耗时）, start(device, protocol), stop(), setProtocol(protocol), setToolsTarget(el), attach(el)
 * }
 */
export const useFace3Context = () => useContext(Face3Context);

/** 页面里放实时画面的位置：铺满父级（16:9 画面框）。只在正在看这台时渲染它。 */
export function Face3LiveSlot() {
  const { attach } = useFace3Context();
  const ref = useRef(null);
  useLayoutEffect(() => attach(ref.current), [attach]);
  return <Box ref={ref} sx={{ position: 'absolute', inset: 0 }} />;
}
