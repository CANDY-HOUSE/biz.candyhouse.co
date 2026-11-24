/** 元数据只决定显示范围，真实定位仍由媒体可定位范围和 seeked 决定。 */
export function createRecordingTimeline(video, options) {
  const validSeconds = (ms) => (Number.isFinite(Number(ms)) && Number(ms) > 0 ? Number(ms) / 1000 : 0);
  const knownDuration = validSeconds(options.durationMs) || validSeconds(options.fallbackDurationMs);
  const now = options.now || (() => performance.now());
  let nativeDuration = 0;
  let pending = null;
  let disposed = false;
  let incomplete = false;
  let lastProgress = now();
  let lastRanges = '';
  const duration = () => knownDuration || nativeDuration;
  const ranges = () =>
    [video.buffered, video.seekable]
      .map((r) => {
        let result = '';
        for (let i = 0; i < r.length; i++) result += `${r.start(i)}:${r.end(i)};`;
        return result;
      })
      .join('|');
  const report = () => {
    if (disposed) return;
    options.onUpdate({
      time: video.currentTime,
      duration: duration(),
      target: pending?.target ?? null,
      seeking: Boolean(pending),
      stalled: Boolean(pending && now() - lastProgress >= (options.stallMs || 15000)),
      incomplete,
    });
  };
  const attempt = () => {
    if (!pending || pending.applying || !video.readyState) return;
    for (let i = 0; i < video.seekable.length; i++) {
      const end = video.seekable.end(i);
      if (pending.target >= video.seekable.start(i) && pending.target <= end && pending.attemptedEnd !== end) {
        pending.attemptedEnd = end;
        pending.applying = true;
        video.currentTime = pending.target;
        break;
      }
    }
  };
  const update = () => {
    if (Number.isFinite(video.duration) && video.duration > 0)
      nativeDuration = Math.max(nativeDuration, video.duration);
    const signature = ranges();
    if (signature !== lastRanges) {
      lastRanges = signature;
      lastProgress = now();
    }
    attempt();
    report();
  };
  const seeked = () => {
    if (pending && Math.abs(video.currentTime - pending.target) <= 0.25) {
      // 滑块步长为0.1秒，浏览器也可能把最后一个刻度归到EOF；末尾停住避免play从零重播。
      const resume = pending.resume && pending.target < duration() - 0.1;
      pending = null;
      incomplete = false;
      report();
      if (resume && !disposed && !video.ended) video.play().catch(() => {});
    } else {
      if (pending) pending.applying = false;
      update();
    }
  };
  const events = {
    loadedmetadata: update,
    durationchange: update,
    progress: update,
    canplay: update,
    timeupdate: report,
    seeking: report,
    seeked,
    error: () => {
      pending = null;
      report();
    },
    ended: () => {
      if (pending) return;
      if (knownDuration && video.currentTime + 0.25 < knownDuration) {
        incomplete = true;
        report();
      } else options.onEnded?.();
    },
  };
  Object.entries(events).forEach(([name, handler]) => video.addEventListener(name, handler));
  const timer = setInterval(() => {
    if (pending) update();
  }, 500);
  update();
  return {
    seek(value) {
      if (disposed || !Number.isFinite(value) || !duration()) return;
      const resume = pending ? pending.resume : !video.paused && !video.ended;
      const origin = pending ? pending.origin : video.currentTime;
      pending = { target: Math.max(0, Math.min(value, duration())), origin, resume, applying: false };
      incomplete = false;
      lastProgress = now();
      video.pause();
      update();
    },
    toggle() {
      if (disposed) return;
      if (pending) {
        pending.resume = !pending.resume;
        report();
        return;
      }
      if (video.paused || video.ended) video.play().catch(() => {});
      else video.pause();
    },
    cancel() {
      if (disposed || !pending) return;
      const { origin, resume, applying } = pending;
      pending = null;
      if (applying) {
        // 部分浏览器仅改currentTime仍等待旧Range；load明确中止旧请求，再恢复取消前的位置。
        video.load();
        video.currentTime = origin;
      }
      report();
      if (resume && !disposed && !video.ended) video.play().catch(() => {});
    },
    dispose() {
      disposed = true;
      pending = null;
      clearInterval(timer);
      Object.entries(events).forEach(([name, handler]) => video.removeEventListener(name, handler));
    },
  };
}
