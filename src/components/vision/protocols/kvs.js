import { startFace3Viewer } from './kvsViewer';

/**
 * KVS 直连：手机直接进设备的 KVS 信令通道，一对一。
 *
 * 凭证（op:"viewer" 返回 data.mode "kvs"）：
 *   { mode, channelArn, region, clientId, credentials, iceServers }
 *   credentials 是只能连这一个频道的临时凭证。接口说明见 ./index.js。
 */
export const kvsProtocol = {
  mode: 'kvs',
  loadViewer: () => Promise.resolve(startFace3Viewer),
  fallback: null,
};
