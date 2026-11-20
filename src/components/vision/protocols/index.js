import { startFace3Viewer } from './kvsViewer';

/**
 * Face3 实时画面的取流协议（策略）。
 *
 * UI 只有一套（Face3LiveView），唤醒、超时、自动重连、媒体控制都在 UI 里。协议的选择：
 *   1. 前端按本机 AI 开关选想要的协议（selectFace3Protocol），把它的 mode 带给 op:"viewer"
 *   2. 云端按 mode 签凭证，data.mode 返回实际签的那种（要 LiveKit 签不出时退回 KVS）
 *   3. 前端按返回的 mode 选协议（protocolForMode），加载对应 SDK 的观看端
 *
 * 策略对象：
 *   mode          与云端约定的协议名（op:"viewer" 的 mode / data.mode）
 *   loadViewer()  Promise<startViewer(data, handlers) → 观看端句柄>，
 *                 两个观看端的 handlers 与句柄接口一致（见 kvsViewer.js）
 *   fallback      本机加载 SDK 失败时改要的协议，没有则直接报错
 */

/**
 * KVS 直连：手机直接进设备的 KVS 信令通道，一对一。
 *
 * 凭证（op:"viewer" 返回 data.mode "kvs"）：
 *   { mode, channelArn, region, clientId, credentials, iceServers }
 *   credentials 是只能连这一个频道的临时凭证。
 */
export const kvsProtocol = {
  mode: 'kvs',
  loadViewer: () => Promise.resolve(startFace3Viewer),
  fallback: null,
};

/**
 * LiveKit：手机进 LiveKit 房间 face3-<UUID>，由 face3_media_bridge 连设备。
 * 多人观看 / 多方通话，AI 分析也在这个房间里。
 *
 * 凭证（op:"viewer" 返回 data.mode "livekit"）：{ mode, url, room, identity, token, expiresAt }
 * livekit-client 约 130KB gzip，只在云端签了 LiveKit 时按需加载（单独分包）。
 */
export const liveKitProtocol = {
  mode: 'livekit',
  loadViewer: () => import('./liveKitViewer').then((module) => module.startFace3LiveKitViewer),
  /* 本机加载 SDK 失败：改要 KVS 凭证 */
  fallback: kvsProtocol,
};

export { getFace3ViewerEnvironmentError } from './kvsViewer';

const PROTOCOLS = { [kvsProtocol.mode]: kvsProtocol, [liveKitProtocol.mode]: liveKitProtocol };

/** 想要的协议。暂时由本机 AI 开关决定：开 → LiveKit（AI 分析在 LiveKit 房间里），关 → KVS 直连。 */
export const selectFace3Protocol = ({ aiEnabled }) => (aiEnabled ? liveKitProtocol : kvsProtocol);

/** 云端实际签的协议。旧版云端不返回 mode，签的都是 KVS。 */
export const protocolForMode = (mode) => PROTOCOLS[mode] || kvsProtocol;
