import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';

/**
 * Face3 多人观看 / 多方通话观看端（LiveKit）。
 *
 * 与 face3Viewer.js（KVS 直连）接口完全一致，Face3LiveView 按开关二选一：
 *
 *   手机 ──LiveKit 房间 face3-<UUID>──▶ face3_media_bridge ──KVS──▶ 设备
 *
 * 设备只跟 Bridge 连一条，看的人再多设备也只传一份；Bridge 在手机进房时
 * （LiveKit webhook）自动连设备。凭证由 Face3_qr 的 op:"live" 签发。
 *
 * 房间里的参与者：
 *   bridge:<UUID>  发布门口画面 door-video 和声音 door-audio → 交给 onStream 播放
 *   viewer:<...>   其他手机。只订阅他们的声音（多方通话彼此听得到），不订阅画面，
 *                  省流量；他们的声音用隐藏的 <audio> 播，跟随扬声器开关(setRemoteAudio)
 * 本机开麦/开摄像头都直接发布到房间：Bridge 把所有人的声音混音送门口喇叭，
 * 门口屏幕显示谁由 Bridge 的视频话权决定。
 */

/** 从进房到出门口画面的整体超时：Bridge 连设备要等设备冷启动（约 7~15 秒）。 */
const CONNECT_TIMEOUT_MS = 45000;
/* 已接通后门口画面消失（Bridge 离开房间 / 与 LiveKit 断开）多久判定中断。
   与 face3Viewer 一致，期间提示"正在重连"。LiveKit 自己的断线重连也在这段时间里完成。 */
const DISCONNECT_GRACE_MS = 15000;

/* 门口屏幕是 450x600 竖屏，设备只解 H.264。参数与 face3Viewer 保持一致。 */
const CAMERA_STREAM_FPS = 15;
const CAMERA_MAX_BITRATE_BPS = 256000;

const DOOR_PREFIX = 'bridge:';
const DOOR_AUDIO_WAIT_MS = 1500;
const isDoor = (participant) => Boolean(participant?.identity?.startsWith(DOOR_PREFIX));
/* Bridge 自身的参与者属性：门铃（设备）连接状态 connected / reconnecting / offline。
   Bridge 一发现设备断开就置 reconnecting，重连失败先置 offline 再离开房间。
   有了它，通话中门铃断电不必等画面消失 + 15 秒宽限（原来约 55 秒）才提示。 */
const DOOR_STATE_ATTR = 'face3.door';

const logi = (...args) => {
  // eslint-disable-next-line no-console
  console.info('[face3LiveKit]', ...args);
};

/**
 * @param {{url: string, token: string, identity?: string}} cfg op:"live" 返回的 data
 * @param {object} handlers 同 startFace3Viewer
 * @returns {{ close, setCameraEnabled, setMicrophoneEnabled, setRemoteAudio }}
 */
export function startFace3LiveKitViewer(
  cfg,
  { onStream, onLocalStream, onError, onState, onEnded, onLocalMediaError, onLocalMediaState }
) {
  const { url, token } = cfg || {};
  let closed = false;
  let delivered = false;
  let connectedOnce = false;
  let ended = false;
  let graceTimer = null;
  const doorStream = new MediaStream();
  const peerAudio = new Map(); // track.sid -> HTMLAudioElement
  let peerMuted = true;
  let peerVolume = 1;

  const say = (s) => {
    if (closed) return;
    logi('state', s);
    onState?.(s);
  };

  const room = new Room({
    adaptiveStream: false,
    dynacast: false,
    disconnectOnPageLeave: true,
    audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const cleanupRemote = () => {
    peerAudio.forEach((el) => {
      el.pause?.();
      el.srcObject = null;
      el.remove();
    });
    peerAudio.clear();
    doorStream.getTracks().forEach((t) => doorStream.removeTrack(t));
  };

  /* ---- 本地媒体 ---- */

  const media = {
    camera: { generation: 0, state: 'disabled', cleanup: null },
    microphone: { generation: 0, state: 'disabled', cleanup: null },
  };

  const reportLocalMediaError = (kind, error) => {
    if (closed) return;
    const name = error?.name;
    let reason = 'unavailable';
    if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(name)) reason = 'permission_denied';
    else if (['NotFoundError', 'DevicesNotFoundError'].includes(name)) reason = 'not_found';
    else if (name === 'TimeoutError') reason = 'timeout';
    else if (!navigator.mediaDevices?.getUserMedia || name === 'NotSupportedError') reason = 'unsupported';
    onLocalMediaError?.({ kind, reason });
  };

  const setMediaState = (kind, state) => {
    media[kind].state = state;
    if (!closed) onLocalMediaState?.({ kind, state });
  };

  /* 摄像头：和 face3Viewer 一样经 canvas 转成 450x600 竖屏再发，门口屏不缩放不旋转。 */
  const openCamera = async (active) => {
    const raw = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 600, max: 600 },
        height: { ideal: 450, max: 450 },
        aspectRatio: { ideal: 4 / 3 },
        frameRate: { ideal: 15, max: 15 },
      },
    });
    const stopRaw = () => raw.getTracks().forEach((t) => t.stop());
    if (!active()) {
      stopRaw();
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 450;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.captureStream) {
      stopRaw();
      throw new DOMException('Canvas video capture unavailable', 'NotSupportedError');
    }
    const source = document.createElement('video');
    source.muted = true;
    source.playsInline = true;
    source.srcObject = raw;
    await source.play();
    const draw = () => {
      if (!source.videoWidth || !source.videoHeight) return;
      const scale = Math.min(600 / source.videoWidth, 450 / source.videoHeight);
      const width = source.videoWidth * scale;
      const height = source.videoHeight * scale;
      ctx.setTransform(0, 1, -1, 0, 450, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 600, 450);
      ctx.drawImage(source, (600 - width) / 2, (450 - height) / 2, width, height);
    };
    draw();
    const out = canvas.captureStream(CAMERA_STREAM_FPS);
    const drawTimer = setInterval(draw, 1000 / CAMERA_STREAM_FPS);
    const track = out.getVideoTracks()[0];
    const cleanup = () => {
      clearInterval(drawTimer);
      source.pause();
      source.srcObject = null;
      out.getTracks().forEach((t) => t.stop());
      stopRaw();
    };
    if (!track) {
      cleanup();
      throw new DOMException('Canvas video track unavailable', 'NotSupportedError');
    }
    return { raw, track, cleanup };
  };

  const setLocalMediaEnabled = async (kind, enabled) => {
    if (closed) return;
    const m = media[kind];
    if (!enabled) {
      m.generation += 1;
      const cleanup = m.cleanup;
      m.cleanup = null;
      setMediaState(kind, 'disabled');
      if (cleanup) await cleanup().catch(() => {});
      return;
    }
    if (m.state !== 'disabled') return;
    if (room.state !== ConnectionState.Connected) {
      reportLocalMediaError(kind, new Error('Room not connected'));
      return;
    }
    const generation = ++m.generation;
    const active = () => !closed && m.generation === generation;
    setMediaState(kind, 'starting');
    try {
      if (kind === 'microphone') {
        const pub = await room.localParticipant.setMicrophoneEnabled(true);
        if (!active()) {
          await room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
          return;
        }
        m.cleanup = async () => {
          await room.localParticipant.setMicrophoneEnabled(false);
        };
        pub?.track?.mediaStreamTrack?.addEventListener?.('ended', () => {
          if (active()) {
            setLocalMediaEnabled(kind, false);
            reportLocalMediaError(kind, new DOMException('Media source ended', 'NotReadableError'));
          }
        });
      } else {
        const cam = await openCamera(active);
        if (!cam) return;
        if (!active()) {
          cam.cleanup();
          return;
        }
        /* 门口只解 H.264：不能让 LiveKit 默认选 VP8，也不开 simulcast（Bridge 原样转发一路）。 */
        const pub = await room.localParticipant.publishTrack(cam.track, {
          source: Track.Source.Camera,
          videoCodec: 'h264',
          backupCodec: false,
          simulcast: false,
          videoEncoding: { maxBitrate: CAMERA_MAX_BITRATE_BPS, maxFramerate: CAMERA_STREAM_FPS },
          degradationPreference: 'maintain-framerate',
        });
        const cleanup = async () => {
          try {
            if (pub?.track) await room.localParticipant.unpublishTrack(pub.track, true);
          } finally {
            cam.cleanup();
            if (!closed) onLocalStream?.(null);
          }
        };
        if (!active()) {
          await cleanup();
          return;
        }
        m.cleanup = cleanup;
        cam.raw.getVideoTracks()[0]?.addEventListener?.('ended', () => {
          if (active()) {
            setLocalMediaEnabled(kind, false);
            reportLocalMediaError(kind, new DOMException('Media source ended', 'NotReadableError'));
          }
        });
        onLocalStream?.(cam.raw);
      }
      setMediaState(kind, 'enabled');
      logi(kind + ' enabled');
    } catch (err) {
      if (!active()) return;
      m.generation += 1;
      setMediaState(kind, 'disabled');
      logi(kind + ' unavailable', err?.name, err?.message);
      reportLocalMediaError(kind, err);
    }
  };

  /* ---- 远端 ---- */

  const fail = (key) => {
    if (closed || ended) return;
    ended = true;
    logi('fail', key);
    close();
    onError?.(key);
  };

  const endCall = (why) => {
    if (closed || ended) return;
    ended = true;
    logi('ended', why);
    close();
    onEnded?.();
  };

  /* 门口画面暂时没了：给一段宽限，期间 Bridge 回来（设备重连 / LiveKit 重连）就继续。 */
  const startGrace = (why) => {
    if (closed || !connectedOnce || graceTimer) return;
    logi('grace start', why);
    say('reconnecting');
    graceTimer = setTimeout(() => endCall(why), DISCONNECT_GRACE_MS);
  };
  const stopGrace = () => {
    if (!graceTimer) return;
    clearTimeout(graceTimer);
    graceTimer = null;
    say('reconnected');
  };

  let deliverTimer = null;
  const deliver = () => {
    clearTimeout(deliverTimer);
    if (closed || delivered) return;
    delivered = true;
    connectedOnce = true;
    clearTimeout(connectTimer);
    say('playing');
    onStream?.(doorStream);
  };

  const connectTimer = setTimeout(() => {
    if (!delivered) fail('errTimeout');
  }, CONNECT_TIMEOUT_MS);

  const onDoorState = (state) => {
    if (closed || ended || !state) return;
    logi('door state', state);
    if (state === 'offline') {
      fail('errDoorOffline');
    } else if (state === 'reconnecting') {
      startGrace('door reconnecting');
    } else if (state === 'connected') {
      const hasVideo = doorStream.getVideoTracks().some((t) => t.readyState === 'live');
      if (hasVideo) stopGrace();
    }
  };

  const subscribeWanted = (pub, participant) => {
    /* 门口的音视频都要；其他手机只要声音。 */
    const want = isDoor(participant) || pub.kind === Track.Kind.Audio;
    if (pub.isSubscribed !== want) pub.setSubscribed(want);
  };

  room
    .on(RoomEvent.TrackPublished, (pub, participant) => subscribeWanted(pub, participant))
    .on(RoomEvent.ParticipantConnected, (participant) => {
      participant.trackPublications.forEach((pub) => subscribeWanted(pub, participant));
    })
    .on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
      if (closed) return;
      if (isDoor(participant)) {
        doorStream
          .getTracks()
          .filter((t) => t.kind === track.kind)
          .forEach((t) => doorStream.removeTrack(t));
        doorStream.addTrack(track.mediaStreamTrack);
        logi('door track', track.kind);
        if (track.kind === Track.Kind.Video) stopGrace();
        if (!delivered && doorStream.getVideoTracks().length) {
          /* 等声音也到了再交给 <video>：有的 WebView 不播放赋值之后才加进流的音轨。
             声音迟迟不来（Bridge 转码不可用）也不能卡住画面，最多等 1.5 秒。 */
          if (doorStream.getAudioTracks().length) deliver();
          else if (!deliverTimer) deliverTimer = setTimeout(deliver, DOOR_AUDIO_WAIT_MS);
        }
        return;
      }
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.muted = peerMuted;
        el.volume = peerVolume;
        el.style.display = 'none';
        document.body.appendChild(el);
        peerAudio.set(track.sid, el);
        logi('peer audio from', participant.identity);
      }
    })
    .on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
      if (isDoor(participant)) {
        doorStream.removeTrack(track.mediaStreamTrack);
        if (track.kind === Track.Kind.Video) startGrace('door video gone');
        return;
      }
      const el = peerAudio.get(track.sid);
      if (el) {
        track.detach(el);
        el.remove();
        peerAudio.delete(track.sid);
      }
    })
    .on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (isDoor(participant)) startGrace('bridge left');
    })
    .on(RoomEvent.ParticipantAttributesChanged, (changed, participant) => {
      if (isDoor(participant) && changed && DOOR_STATE_ATTR in changed) onDoorState(changed[DOOR_STATE_ATTR]);
    })
    .on(RoomEvent.Reconnecting, () => startGrace('livekit reconnecting'))
    .on(RoomEvent.Reconnected, () => {
      /* LiveKit 恢复了，但门口画面要等 TrackSubscribed 才算真回来。 */
      const hasVideo = doorStream.getVideoTracks().some((t) => t.readyState === 'live');
      if (hasVideo) stopGrace();
    })
    .on(RoomEvent.Disconnected, (reason) => {
      if (closed) return;
      logi('disconnected', reason);
      if (connectedOnce) endCall('room disconnected');
      else fail('errSignalingClosed');
    });

  if (!url || !token) {
    setTimeout(() => fail('errBadConfig'), 0);
  } else {
    say('connecting');
    room
      .connect(url, token, { autoSubscribe: false })
      .then(() => {
        if (closed) return;
        logi('room connected', room.name, 'as', room.localParticipant.identity);
        room.remoteParticipants.forEach((participant) =>
          participant.trackPublications.forEach((pub) => subscribeWanted(pub, participant))
        );
        /* 进房时 Bridge 已经报了离线（重连失败、正要离开）：直接提示，不等超时。 */
        room.remoteParticipants.forEach((participant) => {
          if (isDoor(participant) && participant.attributes?.[DOOR_STATE_ATTR] === 'offline') onDoorState('offline');
        });
        /* 控制通道由 Bridge 负责，开麦/开摄像头不需要等设备确认。 */
        say('observation_supported');
        say('answered');
      })
      .catch((err) => {
        logi('connect failed', err?.name, err?.message);
        fail('errSignaling');
      });
  }

  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(connectTimer);
    clearTimeout(graceTimer);
    clearTimeout(deliverTimer);
    Object.values(media).forEach((m) => {
      m.generation += 1;
      const cleanup = m.cleanup;
      m.cleanup = null;
      cleanup?.().catch(() => {});
    });
    cleanupRemote();
    room.disconnect().catch(() => {});
  }

  return {
    close,
    setCameraEnabled: (enabled) => setLocalMediaEnabled('camera', enabled),
    setMicrophoneEnabled: (enabled) => setLocalMediaEnabled('microphone', enabled),
    /* 其他手机的声音跟随扬声器开关和音量（门口的声音由调用方的 <video> 控制）。 */
    setRemoteAudio: ({ muted, volume }) => {
      if (typeof muted === 'boolean') peerMuted = muted;
      if (typeof volume === 'number') peerVolume = Math.max(0, Math.min(1, volume));
      peerAudio.forEach((el) => {
        el.muted = peerMuted;
        el.volume = peerVolume;
        if (!peerMuted) el.play?.().catch(() => {});
      });
    },
  };
}
