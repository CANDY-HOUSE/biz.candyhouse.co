import { kvsProtocol } from './kvs';

/**
 * LiveKit：手机进 LiveKit 房间 face3-<UUID>，由 face3_media_bridge 连设备。
 * 多人观看 / 多方通话，AI 分析也在这个房间里。
 *
 * 凭证（op:"viewer" 返回 data.mode "livekit"）：{ mode, url, room, identity, token, expiresAt }
 * 接口说明见 ./index.js。livekit-client 约 130KB gzip，只在云端签了 LiveKit 时按需加载。
 */
export const liveKitProtocol = {
  mode: 'livekit',
  loadViewer: () => import('./liveKitViewer').then((module) => module.startFace3LiveKitViewer),
  /* 本机加载 SDK 失败：改要 KVS 凭证 */
  fallback: kvsProtocol,
};
