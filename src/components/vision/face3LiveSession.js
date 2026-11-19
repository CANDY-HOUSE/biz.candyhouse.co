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
import { Box } from '@mui/material';
import Face3LiveView from './Face3LiveView';

/**
 * Face3 实时画面会话：Vision 首页正在看的那台，点进它的详情页时连接不断、直接带入。
 *
 * 两个页面是不同的路由，换页时首页整个卸载；Face3LiveView 若放在页面里，连接就跟着关了，
 * 详情页只能重新唤醒、重新连（黑屏转圈好几秒，设备旧会话没释放时还可能连不上）。
 * 所以由这里（路由之外）渲染 Face3LiveView（同一时刻一路），渲染进一个常驻的 hostEl；
 * 页面只放一个"槽位"（Face3LiveSlot），把 hostEl 挂进自己的画面框。
 *
 * 什么时候结束：会话记着自己是在哪个页面（pathname）开的。离开那个页面就停 —— 包括从详情页
 * 返回首页、去别的页面；唯一例外是"从首页进入这台的详情页"（首页跳转时带上 carryFace3Live 的
 * location.state），这时带入，页面记为详情页。同一页面内只改查询参数（pathname 不变）不算换页。
 *
 * 按"开播的页面"而不是"上一个页面"判断：门铃推送从别的页面跳到 /vision?live=1 时，
 * 首页挂载就开播（列表已在内存里），和这次换页在同一次渲染里 —— 若按"换页了就停"，
 * 刚开的画面会被立刻关掉。
 *
 * 不看实时时这里不渲染任何东西，对其他页面没有影响（只是多一个 context 和路由监听）。
 */
const CARRY_STATE_KEY = 'carryFace3Live';

/** 首页跳到详情页时作为 navigate 的 state：这台正在看就带入详情页，不断开 */
export const carryFace3Live = (deviceUUID) => ({ [CARRY_STATE_KEY]: String(deviceUUID || '').toUpperCase() });

const Face3LiveSessionContext = createContext(null);

export function Face3LiveSessionProvider({ children }) {
  const [session, setSession] = useState(null); // { id, device, protocol, path }
  const [toolsTarget, setToolsTarget] = useState(null);
  const [hostEl] = useState(() => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;inset:0;';
    return el;
  });
  const seq = useRef(0);

  const stop = useCallback(() => setSession(null), []);

  /* 当前页面。渲染时就更新（而不是放进 effect）：页面在挂载的 effect 里调 start 时，
     要拿到的是这次的新页面，子组件的 effect 比这里的 effect 先跑 */
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

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
    const path = pathnameRef.current;
    setSession((current) =>
      current && current.device.deviceUUID.toUpperCase() === device.deviceUUID.toUpperCase()
        ? { ...current, device, protocol, path }
        : { id: ++seq.current, device, protocol, path }
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
  const value = useMemo(
    () => ({ liveUUID, start, stop, setProtocol, setToolsTarget, attach }),
    [liveUUID, start, stop, setProtocol, attach]
  );

  return (
    <Face3LiveSessionContext.Provider value={value}>
      {children}
      {session &&
        createPortal(
          <Face3LiveView
            key={session.id}
            device={session.device}
            protocol={session.protocol}
            onClose={stop}
            label="LIVE"
            toolsTarget={toolsTarget}
          />,
          hostEl
        )}
    </Face3LiveSessionContext.Provider>
  );
}

/** { liveUUID, start(device, protocol), stop(), setProtocol(protocol), setToolsTarget(el), attach(el) } */
export const useFace3LiveSession = () => useContext(Face3LiveSessionContext);

/** 页面里放实时画面的位置：铺满父级（16:9 画面框）。只在正在看这台时渲染它。 */
export function Face3LiveSlot() {
  const { attach } = useFace3LiveSession();
  const ref = useRef(null);
  useLayoutEffect(() => attach(ref.current), [attach]);
  return <Box ref={ref} sx={{ position: 'absolute', inset: 0 }} />;
}
