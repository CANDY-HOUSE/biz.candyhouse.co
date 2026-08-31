import { SignalingClient, Role } from 'amazon-kinesis-video-streams-webrtc';

/**
 * KVS WebRTC 观看端。
 *
 * 设备是 MASTER（推流），H5 是 VIEWER（收流）。流程：
 *
 *   1. 连信令通道（WSS，用云端签发的受限临时凭证签名）
 *   2. 建 RTCPeerConnection，只收不发（recvonly）
 *   3. 发 SDP offer → 设备回 answer
 *   4. 双向交换 ICE candidate
 *   5. ontrack 拿到远端流，挂到 <video>
 *
 * 凭证由 Face3_qr 的 op:"viewer" 签发，只能连这一个频道、15 分钟有效，
 * 所以浏览器里不存在长期密钥。
 */

/** 从发起到出画的整体超时。超过就当失败，让用户重试而不是无限转圈。 */
const CONNECT_TIMEOUT_MS = 30000;

/**
 * 重发 offer 的间隔。
 *
 * 唤醒只是把命令递到 WiFi 模块，T32 还要冷启动、连 KVS 信令，实测约 7 秒。
 * 而 KVS 信令不替不在线的 MASTER 暂存 SDP —— offer 发出去没人收就直接丢，
 * 且不回错误。只发一次的话 viewer 会一直停在 have-local-offer 等到超时。
 */
const OFFER_RETRY_MS = 2000;

/**
 * offer 的 SDP 字节数上限。
 *
 * 设备端 KVS 嵌入式 SDK 的 MAX_SIGNALING_MESSAGE_LEN 是 10*1024，量的是
 * **base64 之后**的信令负载。而负载是 base64(JSON.stringify({type, sdp}))：
 * JSON 会把每个 \r\n 转义成两个字符，base64 再涨 4/3。所以 SDP 本身要留到
 * 7000 上下才安全。
 *
 * 越界的后果不是报错而是断连：设备收到就抛
 * STATUS_SIGNALING_RECEIVED_MESSAGE_LARGER_THAN_MAX_DATA_LEN(0x5d000028)
 * 并断开信令，接着无限重连——两头日志都看不出是同一件事。
 */
const OFFER_SDP_WARN_BYTES = 7000;

/**
 * 只保留设备真正会用的编解码器。
 *
 * Chrome 默认的 offer 会把 VP8/VP9/AV1/H264 各 profile、RTX/RED/ULPFEC，
 * 音频的 opus/G722/PCMU/PCMA/CN/telephone-event 连同一堆 header extension
 * 全列出来，实测 8KB 出头——光这就已经越过上限了，一个 candidate 都还没加。
 *
 * 设备侧固定是 H264 + ALAW(见 kvs_webrtc.c 的 videoCodec/audioCodec)，
 * 其余条目对它毫无意义，纯粹是白占字节。
 *
 * 拿不到 capabilities 或浏览器不支持 setCodecPreferences 时静默跳过：
 * 裁剪是优化不是前提，老浏览器上不该因此完全不能播。
 */
const preferCodecs = (transceiver, kind, wanted) => {
  try {
    const caps = window.RTCRtpReceiver?.getCapabilities?.(kind);
    if (!caps?.codecs || !transceiver?.setCodecPreferences) return;
    const keep = caps.codecs.filter((c) => wanted.some((w) => (c.mimeType || '').toLowerCase() === w));
    if (keep.length) transceiver.setCodecPreferences(keep);
  } catch {
    /* 某些 WebView 上 setCodecPreferences 会直接抛，忽略即可 */
  }
};

/**
 * 把任意值压成一行字符串。
 *
 * Android WebView 的 console 桥接只保留字符串：console.log('x', obj) 到了
 * logcat 里就是 "x [object Object]"，对象内容全丢。排查全靠这些字段，所以
 * 一律自己拼进消息里，不依赖 console 的多参数格式化。
 * Error 单独处理 —— JSON.stringify(new Error('x')) 得到的是 {}。
 */
const brief = (v) => {
  if (v === undefined || v === null) return '';
  if (v instanceof Error) return v.name + ': ' + v.message;
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

/**
 * @param {object} cfg  op:"viewer" 返回的 data
 * @param {object} handlers
 * @param {(stream: MediaStream) => void} handlers.onStream  拿到远端流
 * @param {(reasonKey: string) => void} handlers.onError     出错，参数是 i18n key 后缀
 * @param {(state: string) => void} [handlers.onState]       连接状态变化，用于 UI 提示
 * @returns {{ close: () => void }} 调用方必须在卸载时 close()
 */
export function startFace3Viewer(cfg, { onStream, onError, onState }) {
  const { channelArn, region, clientId, credentials, iceServers } = cfg || {};

  let signalingClient = null;
  let peer = null;
  let closed = false;
  let timer = null;
  let offerTimer = null;

  /* 纯排查用。超时只报一句 errTimeout 等于什么都没说：卡在信令、设备没回
     answer、answer 回了但 ICE 打不通 —— 三种情况的排查方向完全不同。
     candidate 按 typ 分类计数尤其关键：只有 host 说明 STUN/TURN 没生效。 */
  const diag = {
    signalingOpen: false,
    offerSent: false,
    offerAttempts: 0,
    offerBytes: 0,
    answerReceived: false,
    localCandidates: 0,
    remoteCandidates: 0,
    localTypes: {},
    remoteTypes: {},
  };

  /* 本地收集到的 candidate。设备还没上频道时 trickle 出去的会被丢掉，
     等 answer 回来后补发一遍。 */
  const localPool = [];

  /* SDP candidate 行形如 "candidate:0 1 udp 2113937151 192.168.1.5 55555 typ host ..." */
  const candType = (c) => (/ typ (\w+)/.exec((c && c.candidate) || '') || [])[1] || 'unknown';

  const diagSnapshot = () => ({
    ...diag,
    iceGatheringState: peer?.iceGatheringState,
    iceConnectionState: peer?.iceConnectionState,
    connectionState: peer?.connectionState,
    signalingState: peer?.signalingState,
  });

  const say = (s) => {
    if (!closed) onState?.(s);
  };

  const logi = (msg, obj) => {
    // eslint-disable-next-line no-console
    console.info('[face3Viewer] ' + msg + (obj === undefined ? '' : ' ' + brief(obj)));
  };

  /* 幂等：超时、出错、组件卸载都可能调到，重复调用不能炸 */
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    clearInterval(offerTimer);
    clearInterval(statsTimer);
    /* 顺序要紧：先摘监听再关，否则关闭动作本身会触发 onError 回调，
       把一次正常的主动关闭报成失败 */
    try {
      if (peer) {
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.close();
      }
    } catch {
      /* 已关就算了 */
    }
    try {
      if (signalingClient) {
        signalingClient.close();
      }
    } catch {
      /* 同上 */
    }
    peer = null;
    signalingClient = null;
  };

  /* detail 只进 console，不进 UI —— 用户看不懂 SDK 的内部错误，但排查时非它不可。
     早先这里把错误整个吞掉了，结果只能看到"信令连接失败"四个字，无从下手。 */
  const fail = (key, detail) => {
    if (closed) return;
    // eslint-disable-next-line no-console
    console.error('[face3Viewer] ' + key + ' ' + brief(detail));
    const cb = onError;
    close();
    cb?.(key);
  };

  /* 先查安全上下文。
   *
   * KVS SDK 要对 WSS 做 SigV4 签名，而它用的 isomorphic-webcrypto 在浏览器下
   * 直接取 window.crypto.subtle —— 那个东西只在 HTTPS 或 localhost 下存在。
   * 用 http://<局域网 IP>:3000 调试时它是 undefined，签名失败，SDK 只抛一个
   * 语焉不详的连接错误，很难往这个方向想。所以在这里提前判掉，给出能行动的提示。
   *
   * 注意 isSecureContext 和 crypto.subtle 两个都要看：有的环境前者为 true 但
   * 后者被策略禁掉，反过来也有(某些 WebView)。 */
  if (typeof window !== 'undefined' && (!window.isSecureContext || !window.crypto?.subtle)) {
    // eslint-disable-next-line no-console
    console.error(
      '[face3Viewer] insecure context: crypto.subtle unavailable, ' +
        '用 https 或 localhost 打开，否则 SigV4 签不出来 ' +
        brief({
          isSecureContext: window.isSecureContext,
          hasSubtle: Boolean(window.crypto?.subtle),
          origin: window.location?.origin,
        })
    );
    setTimeout(() => onError?.('errInsecureContext'), 0);
    return { close: () => {} };
  }

  if (!channelArn || !credentials?.accessKeyId) {
    /* 正常情况下云端不会给出这种数据，但真给了要报得明白，
       而不是让 SDK 抛一个看不懂的内部错误 */
    setTimeout(() => onError?.('errBadConfig'), 0);
    return { close: () => {} };
  }

  // eslint-disable-next-line no-console
  console.info(
    '[face3Viewer] connecting ' +
      brief({
        channelArn,
        region,
        clientId,
        wssEndpoint: cfg.wssEndpoint,
        iceServerCount: (iceServers || []).length,
        /* 只打前缀确认凭证到位了，不打密钥本身 */
        ak: credentials.accessKeyId?.slice(0, 8),
        hasSessionToken: Boolean(credentials.sessionToken),
      })
  );

  timer = setTimeout(() => fail('errTimeout', diagSnapshot()), CONNECT_TIMEOUT_MS);

  try {
    signalingClient = new SignalingClient({
      channelARN: channelArn,
      channelEndpoint: cfg.wssEndpoint,
      clientId,
      role: Role.VIEWER,
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
      systemClockOffset: 0,
    });
  } catch (e) {
    fail('errBadConfig', e);
    return { close };
  }

  peer = new RTCPeerConnection({
    iceServers: iceServers || [],
    /* all 而不是 relay：同一局域网下直连比走 TURN 快得多，也省流量。
       TURN 仍在候选里，跨网时会自动用上。 */
    iceTransportPolicy: 'all',
  });

  /* ontrack **每条轨道各触发一次**：这里声明了 video + audio 两个 recvonly
     transceiver，所以会来两次，而且 e.streams[0] 是同一个 MediaStream。
     照单上抛的话调用方会二次赋 srcObject，那等于发起一次新的 load，把上一次
     还没完成的 play() 打断——实测报 AbortError，画面停在一个播放按钮上。
     所以按 stream.id 去重，只上抛第一次。 */
  let deliveredStreamId = null;
  peer.ontrack = (e) => {
    if (closed) return;
    const stream = e.streams[0];
    if (!stream) return;
    clearTimeout(timer);
    if (deliveredStreamId === stream.id) {
      logi('ontrack ' + e.track?.kind + ' (same stream, already delivered)');
      return;
    }
    deliveredStreamId = stream.id;
    logi('ontrack ' + e.track?.kind + ', stream=' + stream.id);
    say('playing');
    onStream?.(stream);
    startStatsProbe();
  };

  /* 远端轨道刚建立时 muted 恒为 true，收到第一个包才转 unmute。
     所以 unmute 有没有来，是"媒体到底有没有流过来"最直接的信号——
     比看画面可靠，也比 getStats 早。 */
  peer.addEventListener?.('track', (e) => {
    const tk = e.track;
    if (!tk) return;
    logi('track ' + tk.kind + ' readyState=' + tk.readyState + ' muted=' + tk.muted);
    tk.onunmute = () => logi('track ' + tk.kind + ' UNMUTED (媒体开始流入)');
    tk.onmute = () => logi('track ' + tk.kind + ' muted (媒体中断)');
    tk.onended = () => logi('track ' + tk.kind + ' ended');
  });

  /* 连上之后采几次统计。分三种情况，处置完全不同：
   *   bytesReceived == 0                → 设备根本没发，查推流端
   *   bytesReceived > 0 但 framesDecoded == 0 → 收到了解不出，多半是 H264
   *                                        profile/packetization 对不上
   *   framesDecoded > 0 却没画面          → 帧是好的，问题在渲染/样式
   * 只采三次就停：这是排查用的，不该长期占着主线程。 */
  /* 前三次密集采样看建连过程，之后每 5 秒一次看趋势——延迟是不是随时间增长，
     只有连续采样才看得出来。 */
  const STATS_PROBE_AT_MS = [3000, 8000, 15000];
  const STATS_PERIOD_MS = 5000;
  let statsProbeStarted = false;
  let statsTimer = null;

  const dumpStats = async (label) => {
    if (closed || !peer) return;
    try {
      const report = await peer.getStats();
      const out = { at: label };
      /* 先按 id 建索引：candidate-pair 只给 localCandidateId/remoteCandidateId，
         要再查一次才知道是 host/srflx/relay。forEach 的顺序不保证候选先于配对
         出现，所以必须先收完再解析。 */
      const byId = new Map();
      report.forEach((r) => byId.set(r.id, r));
      /* 统计里出现过哪些 type，用来证伪"我的过滤条件写错了"——
         inbound-rtp 真的不存在，和存在但没匹配上，是两回事。 */
      const types = new Set();
      report.forEach((r) => {
        types.add(r.type);
        /* kind 是现行字段名，mediaType 是旧名。只认 kind 的话，
           老一点的 Chromium(WebView 常见)会一条都匹配不上，
           看起来就像"完全没收到"，而实际可能只是字段名不同。 */
        const kind = r.kind || r.mediaType;
        if (r.type === 'transport') {
          out.dtls = r.dtlsState;
          out.iceState = r.iceState;
          out.tx = r.bytesSent;
          out.rx = r.bytesReceived;
        }
        if (r.type === 'inbound-rtp' && kind === 'video') {
          out.video = {
            bytes: r.bytesReceived,
            packets: r.packetsReceived,
            lost: r.packetsLost,
            framesReceived: r.framesReceived,
            framesDecoded: r.framesDecoded,
            dropped: r.framesDropped,
            fps: r.framesPerSecond,
            size: `${r.frameWidth || 0}x${r.frameHeight || 0}`,
            pli: r.pliCount,
            nack: r.nackCount,
            freezes: r.freezeCount,
            freezeSec: r.totalFreezesDuration,
            /* 抖动缓冲的平均停留时间。延迟持续增长时，这个数会一路涨——
               它是"播放端在等"和"网络在慢"最直接的分界。 */
            jbMs:
              r.jitterBufferEmittedCount > 0
                ? Math.round((r.jitterBufferDelay / r.jitterBufferEmittedCount) * 1000)
                : null,
            jitterMs: r.jitter !== undefined ? Math.round(r.jitter * 1000) : null,
          };
        }
        if (r.type === 'inbound-rtp' && kind === 'audio') {
          out.audio = { bytes: r.bytesReceived, packets: r.packetsReceived };
        }
        if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) {
          const lc = byId.get(r.localCandidateId);
          const rc = byId.get(r.remoteCandidateId);
          /* host = 局域网直连，srflx = 打洞成功的公网直连，relay = 走 TURN 中继。
             relay 会多一跳到 AWS，延迟和费用都不一样，所以要能一眼看出来。 */
          out.pair = {
            rtt: r.currentRoundTripTime,
            sent: r.bytesSent,
            recv: r.bytesReceived,
            local: lc ? `${lc.candidateType}/${lc.protocol || '?'}` : '?',
            remote: rc ? `${rc.candidateType}/${rc.protocol || '?'}` : '?',
            relayed: lc?.candidateType === 'relay' || rc?.candidateType === 'relay' ? true : false,
          };
        }
      });
      out.types = [...types].join(',');
      logi('stats', out);
    } catch (err) {
      logi('stats failed', err);
    }
  };

  const startStatsProbe = () => {
    if (statsProbeStarted) return;
    statsProbeStarted = true;
    STATS_PROBE_AT_MS.forEach((ms) => {
      setTimeout(() => dumpStats(ms / 1000 + 's'), ms);
    });
    const startedAt = performance.now();
    statsTimer = setInterval(() => {
      dumpStats(Math.round((performance.now() - startedAt) / 1000) + 's');
    }, STATS_PERIOD_MS);
  };

  peer.onicecandidate = ({ candidate }) => {
    /* candidate 为 null 表示收集结束。KVS 不需要这条终止信号，发了反而会报错 */
    if (candidate && !closed) {
      const t = candType(candidate);
      diag.localCandidates += 1;
      diag.localTypes[t] = (diag.localTypes[t] || 0) + 1;
      /* 攒一份：answer 之前发出去的，设备多半还没在频道上，收不到 */
      localPool.push(candidate);
      signalingClient.sendIceCandidate(candidate);
    }
  };

  peer.onconnectionstatechange = () => {
    if (closed || !peer) return;
    /* 每个状态都记：connectionState 走到 connected 才代表 DTLS 也握完了，
       媒体这时才可能流动。只在 failed 时才打日志的话，"卡在 connecting"
       这种最常见的形态反而看不见——而它和"连上了但没帧"处置完全不同。 */
    logi('connectionState=' + peer.connectionState);
    if (peer.connectionState === 'failed') {
      fail('errPeerFailed');
    }
  };

  /* ICE 中间状态在 logcat 里很关键：进到 checking 说明候选对已经在试，
     一直停在 new 说明压根没配上对。 */
  peer.oniceconnectionstatechange = () => {
    if (!closed && peer) logi('iceConnectionState=' + peer.iceConnectionState);
  };
  peer.onicegatheringstatechange = () => {
    if (!closed && peer) logi('iceGatheringState=' + peer.iceGatheringState);
  };

  signalingClient.on('open', async () => {
    if (closed) return;
    diag.signalingOpen = true;
    logi('signaling open');
    say('signaling');
    try {
      /* recvonly：观看端不发画面也不发声音。
         必须在 createOffer 之前声明，否则 offer 里没有 m= 行，设备无从回应。 */
      const videoTr = peer.addTransceiver('video', { direction: 'recvonly' });
      const audioTr = peer.addTransceiver('audio', { direction: 'recvonly' });
      /* rtx 要留着：H264 的丢包重传靠它，去掉会明显掉画质 */
      preferCodecs(videoTr, 'video', ['video/h264', 'video/rtx']);
      preferCodecs(audioTr, 'audio', ['audio/pcma', 'audio/pcmu']);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      /* 重发的必须是这份**不含 candidate** 的原始 offer。
       *
       * 上一版改成重发 peer.localDescription，因为它会随 ICE 收集把 candidate
       * 并进 SDP，看起来正好能补上设备上线前被丢掉的那些。实际是个坑：
       * 24 个 candidate(其中 20 个 relay)进去之后，base64 编码的信令消息越过了
       * KVS 嵌入式 SDK 的 MAX_SIGNALING_MESSAGE_LEN(10KB)，设备一收到就报
       * STATUS_SIGNALING_RECEIVED_MESSAGE_LARGER_THAN_MAX_DATA_LEN(0x5d000028)
       * 并断开信令，然后无限重连——从 H5 这头看就是"发了 15 次 offer 没人理"。
       *
       * candidate 改由 localPool 在拿到 answer 后补发，每条几百字节，不会超限。 */
      const offerSnapshot = { type: offer.type, sdp: offer.sdp };
      diag.offerBytes = (offer.sdp || '').length;
      if (diag.offerBytes > OFFER_SDP_WARN_BYTES) {
        // eslint-disable-next-line no-console
        console.warn(
          '[face3Viewer] offer sdp ' +
            diag.offerBytes +
            'B exceeds ' +
            OFFER_SDP_WARN_BYTES +
            'B —— 设备很可能直接断开信令(0x5d000028)'
        );
      }

      const sendOffer = () => {
        if (closed || diag.answerReceived) return;
        signalingClient.sendSdpOffer(offerSnapshot);
        diag.offerSent = true;
        diag.offerAttempts += 1;
        logi('offer sent #' + diag.offerAttempts + ' (' + diag.offerBytes + 'B sdp)');
      };

      sendOffer();
      offerTimer = setInterval(sendOffer, OFFER_RETRY_MS);
      say('offered');
    } catch (e) {
      fail('errPeerFailed', e);
    }
  });

  signalingClient.on('sdpAnswer', async (answer) => {
    if (closed) return;
    diag.answerReceived = true;
    clearInterval(offerTimer);
    logi('sdpAnswer received after ' + diag.offerAttempts + ' offer(s)');

    /* 补发之前攒下的 candidate：设备上频道之前发的那些它没收到。
       每条几百字节，比塞进 SDP 安全得多；重复的 candidate WebRTC 会自己去重。 */
    if (localPool.length) {
      logi('resending ' + localPool.length + ' pooled candidate(s)');
      localPool.forEach((c) => {
        try {
          signalingClient.sendIceCandidate(c);
        } catch {
          /* 单条失败无所谓，后续 trickle 还会继续 */
        }
      });
    }
    try {
      await peer.setRemoteDescription(answer);
      say('answered');
    } catch (e) {
      fail('errPeerFailed', e);
    }
  });

  signalingClient.on('iceCandidate', (candidate) => {
    if (closed) return;
    /* 设备的 candidate 可能早于 answer 到达，addIceCandidate 会在没有
       remoteDescription 时抛错。吞掉即可 —— WebRTC 本来就允许丢弃部分候选，
       后续还会有。 */
    const t = candType(candidate);
    diag.remoteCandidates += 1;
    diag.remoteTypes[t] = (diag.remoteTypes[t] || 0) + 1;
    peer.addIceCandidate(candidate).catch(() => {});
  });

  signalingClient.on('close', () => {
    /* 信令通道关闭不等于失败：SDP 交换完成后它本来就没用了，
       媒体走的是 P2P。只有还没出画时才算失败。 */
    if (!closed && peer && peer.connectionState !== 'connected') {
      fail('errSignalingClosed');
    }
  });

  signalingClient.on('error', (e) => fail('errSignaling', e));

  say('connecting');
  signalingClient.open();

  return { close };
}
