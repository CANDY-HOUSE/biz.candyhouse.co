import { Auth } from '@aws-amplify/auth';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc';
import AWS from 'aws-sdk';
import { useEffect, useRef } from 'react';

const Camera = () => {
  const region = 'ap-northeast-1';
  const channelARN = 'arn:aws:kinesisvideo:ap-northeast-1:604616125248:channel/AiW4211L-T32ZN/1761720755395';

  // 仅查看远端视频，不请求本地摄像头
  const remoteRef = useRef(null);

  useEffect(() => {
    // WebRTC 信令与连接对象
    let signalingClient;
    let peerConnection;
    // 信令通道是否已 open，用于决定是否立即发送候选
    let isOpen = false;
    // open 之前暂存本地 ICE 候选，待 open 后统一发送
    const pendingCandidates = [];

    (async () => {
      const creds = await Auth.currentCredentials();
      AWS.config.update({ region, credentials: creds });

      // 生成一个合法的 Viewer 端 clientId（KVS 作为信令方需要该标识）
      let clientId = null;
      if (!clientId) {
        const base =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        clientId = `viewer-${base}`.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 256);
      }

      // 初始化 Kinesis Video 客户端，用于获取信令端点等信息
      const kinesisVideoClient = new AWS.KinesisVideo({
        region,
        credentials: AWS.config.credentials,
        correctClockSkew: true, // 纠正时钟偏差，避免鉴权失败
      });

      // 获取信令通道端点（WSS/HTTPS），角色为 VIEWER
      const getSignalingChannelEndpointResponse = await kinesisVideoClient
        .getSignalingChannelEndpoint({
          ChannelARN: channelARN,
          SingleMasterChannelEndpointConfiguration: {
            Protocols: ['WSS', 'HTTPS'],
            Role: 'VIEWER',
          },
        })
        .promise();

      // 整理成 { WSS: 'wss://...', HTTPS: 'https://...' }
      const endpointsByProtocol = getSignalingChannelEndpointResponse.ResourceEndpointList.reduce(
        (endpoints, endpoint) => {
          endpoints[endpoint.Protocol] = endpoint.ResourceEndpoint;
          return endpoints;
        },
        {}
      );

      // 初始化用于获取 ICE Server 配置（STUN/TURN）的客户端（走 HTTPS 端点）
      const kinesisVideoSignalingChannelsClient = new AWS.KinesisVideoSignalingChannels({
        region,
        credentials: AWS.config.credentials,
        endpoint: endpointsByProtocol.HTTPS,
        correctClockSkew: true,
      });

      // 拉取 ICE 服务器配置，构建给 RTCPeerConnection 使用的 iceServers 列表
      const getIceServerConfigResponse = await kinesisVideoSignalingChannelsClient
        .getIceServerConfig({
          ChannelARN: channelARN,
        })
        .promise();
      // 默认包含一个 KVS STUN，随后追加返回的 TURN（含临时用户名/密码）
      const iceServers = [{ urls: `stun:stun.kinesisvideo.${region}.amazonaws.com:443` }];
      getIceServerConfigResponse.IceServerList.forEach((iceServer) =>
        iceServers.push({
          urls: iceServer.Uris,
          username: iceServer.Username,
          credential: iceServer.Password,
        })
      );

      // PeerConnection 初始化
      peerConnection = new RTCPeerConnection({ iceServers });

      // 创建 KVS SignalingClient（WebSocket 信令），用于交换 SDP/ICE
      signalingClient = new SignalingClient({
        channelARN,
        channelEndpoint: endpointsByProtocol.WSS,
        clientId,
        role: 'VIEWER',
        region,
        credentials: {
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
          sessionToken: creds.sessionToken,
        },
        systemClockOffset: kinesisVideoClient.config.systemClockOffset, // 与服务端时钟对齐
      });

      // 信令通道打开后：声明只接收远端音视频、创建 Offer 并发送
      signalingClient.on('open', async () => {
        isOpen = true;

        // 仅接收远端轨道（recvonly），不请求本地 getUserMedia
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });

        // 创建本地 SDP Offer -> 设置本地描述 -> 通过信令发送给 Master
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        signalingClient.sendSdpOffer(peerConnection.localDescription);

        // flush 在 open 之前缓存的 ICE 候选
        pendingCandidates.splice(0).forEach((c) => {
          try {
            signalingClient.sendIceCandidate(c);
          } catch {}
        });
      });

      // 收到 Master 的 SDP Answer，设置为远端描述，完成 SDP 握手
      signalingClient.on('sdpAnswer', async (answer) => {
        await peerConnection.setRemoteDescription(answer);
      });

      // 收到 Master 端的 ICE 候选，加入本地 PeerConnection
      signalingClient.on('iceCandidate', (candidate) => {
        peerConnection.addIceCandidate(candidate);
      });

      // 信令关闭/错误处理（可按需增加重连/告警逻辑）
      signalingClient.on('close', () => {
        isOpen = false;
      });

      signalingClient.on('error', (error) => {
        // TODO: 记录日志/上报错误，必要时触发重试
      });

      // 本地 ICE 收集到候选后，通过信令发送给对端；未 open 时先缓存
      peerConnection.addEventListener('icecandidate', ({ candidate }) => {
        if (!candidate) return;
        if (isOpen) {
          try {
            signalingClient.sendIceCandidate(candidate);
          } catch {}
        } else {
          pendingCandidates.push(candidate);
        }
      });

      // 接收到远端轨道时，将首个流挂到 <video> 播放
      peerConnection.addEventListener('track', ({ track, streams }) => {
        const videoEl = remoteRef.current;
        if (!videoEl) return;

        const incomingStream = streams && streams[0];
        if (!videoEl.srcObject) {
          videoEl.srcObject = incomingStream || new MediaStream([track]);
          return;
        }

        const mediaStream = videoEl.srcObject;
        const hasTrack = mediaStream.getTracks().some((t) => t.id === track.id);
        if (!hasTrack) {
          mediaStream.addTrack(track);
        }
      });

      // 发起与 KVS 的信令连接
      signalingClient.open();
    })();

    // 组件卸载时释放资源：关闭信令、关闭 PeerConnection
    return () => {
      try {
        signalingClient && signalingClient.close();
      } catch {}
      try {
        // 先停止所有已接收的远端 track，帮助对端更快感知断开
        if (peerConnection) {
          peerConnection.getReceivers().forEach((r) => {
            if (r.track) {
              try {
                r.track.stop();
              } catch {}
            }
          });
        }
      } catch {}
      try {
        peerConnection && peerConnection.close();
      } catch {}
      try {
        // 清空 video.srcObject，避免残留流
        const v = remoteRef.current;
        if (v && v.srcObject) {
          const ms = v.srcObject;
          if (ms && typeof ms.getTracks === 'function') {
            ms.getTracks().forEach((t) => {
              try {
                t.stop();
              } catch {}
            });
          }
          v.srcObject = null;
        }
      } catch {}
    };
  }, []);

  return (
    <div>
      <h1>Camera Page</h1>
      <video
        ref={remoteRef}
        muted
        autoPlay
        playsInline
        style={{ width: '900px', height: '600px', backgroundColor: 'black' }}
      ></video>
    </div>
  );
};

export default Camera;
