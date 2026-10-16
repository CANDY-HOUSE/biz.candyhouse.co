/** Convert the device's G.711 A-law WAV to PCM WAV for native audio fallback. */
export function alawWavToPcm(buffer) {
  const view = new DataView(buffer);
  const tag = (offset) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
  if (buffer.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('invalid_wav');
  let format;
  let data;
  for (let offset = 12; offset + 8 <= buffer.byteLength; ) {
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size > buffer.byteLength) throw new Error('truncated_wav');
    if (tag(offset) === 'fmt ' && size >= 16) {
      format = {
        codec: view.getUint16(start, true),
        channels: view.getUint16(start + 2, true),
        rate: view.getUint32(start + 4, true),
        bits: view.getUint16(start + 14, true),
      };
    }
    if (tag(offset) === 'data') data = new Uint8Array(buffer, start, size);
    offset = start + size + (size & 1);
  }
  if (!format || !data || format.codec !== 6 || format.bits !== 8 || format.channels !== 1 || !format.rate) {
    throw new Error('unsupported_wav');
  }
  const result = new ArrayBuffer(44 + data.length * 2);
  const out = new DataView(result);
  const writeTag = (offset, text) => [...text].forEach((c, i) => out.setUint8(offset + i, c.charCodeAt(0)));
  writeTag(0, 'RIFF');
  out.setUint32(4, result.byteLength - 8, true);
  writeTag(8, 'WAVE');
  writeTag(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, format.rate, true);
  out.setUint32(28, format.rate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  writeTag(36, 'data');
  out.setUint32(40, data.length * 2, true);
  data.forEach((byte, i) => {
    const a = byte ^ 0x55;
    const segment = (a & 0x70) >> 4;
    let sample = (a & 0x0f) << 4;
    if (segment === 0) sample += 8;
    else {
      sample += 0x108;
      if (segment > 1) sample <<= segment - 1;
    }
    out.setInt16(44 + i * 2, a & 0x80 ? sample : -sample, true);
  });
  return result;
}

/** Video owns the clock, playback controls, rate and volume. */
export function syncRecordingAudio(video, audio, onBlocked = () => {}) {
  let disposed = false;
  let waiting = false;
  let playPending = false;
  const align = (force = false) => {
    if (!audio.readyState) return;
    const time = Number.isFinite(audio.duration) ? Math.min(video.currentTime, audio.duration) : video.currentTime;
    if (Math.abs(audio.currentTime - time) > (force ? 0.01 : 0.15)) audio.currentTime = time;
    audio.playbackRate = video.playbackRate;
    audio.muted = video.muted;
    audio.volume = video.volume;
  };
  const play = () => {
    align(true);
    if (disposed || waiting || video.paused || video.ended || video.seeking || playPending) return;
    if (Number.isFinite(audio.duration) && video.currentTime >= audio.duration) return;
    playPending = true;
    Promise.resolve(audio.play())
      .then(() => {
        if (disposed || waiting || video.paused || video.ended || video.seeking) audio.pause();
        else onBlocked(false);
      })
      .catch((err) => {
        if (!disposed && err?.name === 'NotAllowedError') onBlocked(true);
      })
      .finally(() => {
        playPending = false;
      });
  };
  const pause = () => audio.pause();
  const handlers = {
    play: () => {
      waiting = false;
      play();
    },
    playing: () => {
      waiting = false;
      play();
    },
    pause,
    ended: pause,
    waiting: () => {
      waiting = true;
      pause();
    },
    seeking: () => {
      pause();
      align(true);
    },
    seeked: () => {
      align(true);
      play();
    },
    ratechange: () => align(),
    volumechange: () => align(),
    timeupdate: () => align(),
  };
  Object.entries(handlers).forEach(([event, fn]) => video.addEventListener(event, fn));
  audio.addEventListener('canplay', play);
  const timer = setInterval(() => {
    if (!video.paused && !waiting && !video.seeking) align();
  }, 200);
  return {
    play,
    dispose() {
      disposed = true;
      clearInterval(timer);
      Object.entries(handlers).forEach(([event, fn]) => video.removeEventListener(event, fn));
      audio.removeEventListener('canplay', play);
      audio.pause();
    },
  };
}
