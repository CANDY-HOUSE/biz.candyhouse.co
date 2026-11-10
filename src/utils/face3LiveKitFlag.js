/* 单独成文件：Face3LiveView 静态引用它，livekit-client（约 130KB gzip）只在开关打开时按需加载。 */
const LIVEKIT_PREF_KEY = 'face3.liveKit';

/**
 * 灰度开关：默认走 KVS 直连；地址栏带 ?lk=1 开启 LiveKit（多人观看 / 多方通话），
 * ?lk=0 关闭，结果记在本机 localStorage，之后不带参数也保持。
 * 全面切换时把默认值改成 true 即可。
 */
export function isFace3LiveKitEnabled() {
  try {
    const q = new URLSearchParams(window.location.search).get('lk');
    if (q === '1' || q === '0') window.localStorage.setItem(LIVEKIT_PREF_KEY, q);
    return window.localStorage.getItem(LIVEKIT_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

/* 页面一加载就读一次：Biz3 登录 / 路由跳转后地址栏的 ?lk= 会丢，
   等用户点开实时画面时再读已经晚了（2026-11-10 台架三台都因此没走 LiveKit）。 */
isFace3LiveKitEnabled();
