import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/components/vision/recordingTimeline.js', import.meta.url), 'utf8');
const { createRecordingTimeline } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);
class Video extends EventTarget {
  constructor() {
    super();
    this.duration = 5;
    this.currentTime = 2;
    this.readyState = 3;
    this.paused = false;
    this.ended = false;
    this.seeking = false;
    this.playCalls = 0;
    this.loadCalls = 0;
    this.end = 5;
    this.seekable = { length: 1, start: () => 0, end: () => this.end };
    this.buffered = this.seekable;
  }
  pause() {
    this.paused = true;
  }
  play() {
    this.playCalls++;
    this.paused = false;
    return Promise.resolve();
  }
  load() {
    this.loadCalls++;
    this.seeking = false;
  }
  emit(name) {
    this.dispatchEvent(new Event(name));
  }
}
function setup(t, options = {}) {
  const video = new Video();
  const states = [];
  const timeline = createRecordingTimeline(video, { durationMs: 60110, ...options, onUpdate: (s) => states.push(s) });
  t.after(() => timeline.dispose());
  return { video, timeline, states, state: () => states.at(-1) };
}
test('元数据保持完整范围，不随原生逐步解析而缩短', (t) => {
  const s = setup(t, { durationMs: 60112 });
  assert.equal(s.state().duration, 60.112);
  s.video.duration = 18;
  s.video.emit('durationchange');
  assert.equal(s.state().duration, 60.112);
});
test('未来目标不截到暂时末尾，覆盖后定位并恢复播放', (t) => {
  const s = setup(t);
  s.timeline.seek(50);
  assert.equal(s.video.currentTime, 2);
  assert.equal(s.state().target, 50);
  s.video.end = 55;
  s.video.emit('progress');
  assert.equal(s.video.currentTime, 50);
  s.video.emit('seeked');
  assert.equal(s.state().target, null);
  assert.equal(s.video.playCalls, 1);
});
test('暂停意图和等待期间的暂停意图均保留', (t) => {
  const s = setup(t);
  s.timeline.seek(50);
  s.timeline.toggle();
  s.video.end = 60;
  s.video.emit('progress');
  s.video.emit('seeked');
  assert.equal(s.video.playCalls, 0);
  assert(s.video.paused);
  s.timeline.seek(12);
  s.video.emit('seeked');
  assert.equal(s.video.playCalls, 0);
});
test('新目标覆盖旧目标，取消不会迟到恢复旧位置', (t) => {
  const s = setup(t);
  s.timeline.seek(50);
  s.timeline.seek(3);
  s.video.emit('seeked');
  assert.equal(s.video.currentTime, 3);
  assert.equal(s.state().target, null);
  s.timeline.seek(55);
  s.timeline.cancel();
  assert.equal(s.state().target, null);
});
test('只有无进展达到阈值才提示停滞，范围推进会清除提示', (t) => {
  let now = 0;
  const s = setup(t, { now: () => now });
  s.timeline.seek(50);
  now = 16000;
  s.video.emit('progress');
  assert(s.state().stalled);
  s.video.end = 20;
  s.video.emit('progress');
  assert(!s.state().stalled);
});
test('临时ended不会关闭录像，真正结束才回调', (t) => {
  let ended = 0;
  const s = setup(t, { onEnded: () => ended++ });
  s.video.emit('ended');
  assert.equal(ended, 0);
  assert(s.state().incomplete);
  s.timeline.seek(50);
  s.video.emit('ended');
  assert.equal(ended, 0);
  s.timeline.cancel();
  s.video.currentTime = 60.11;
  s.video.emit('ended');
  assert.equal(ended, 1);
});
test('非法元数据回退原生时长，已解析值不后退', (t) => {
  const s = setup(t, { durationMs: NaN, fallbackDurationMs: -1 });
  assert.equal(s.state().duration, 5);
  s.video.duration = 3;
  s.video.emit('durationchange');
  assert.equal(s.state().duration, 5);
});
test('释放后旧事件、定时器和定位请求均不影响新会话', (t) => {
  const s = setup(t);
  s.timeline.seek(50);
  s.timeline.dispose();
  const count = s.states.length;
  s.video.end = 60;
  s.video.emit('progress');
  s.video.emit('seeked');
  s.timeline.seek(12);
  assert.equal(s.states.length, count);
  assert.equal(s.video.playCalls, 0);
});

test('取消已发出的定位会中止旧Range并恢复原位置，迟到seeked不再触发播放', (t) => {
  const s = setup(t);
  s.video.end = 61;
  s.timeline.seek(50);
  s.video.seeking = true;
  s.timeline.cancel();
  assert.equal(s.video.loadCalls, 1);
  assert.equal(s.video.currentTime, 2);
  assert.equal(s.state().seeking, false);
  assert.equal(s.video.playCalls, 1);
  s.video.emit('seeked');
  assert.equal(s.video.playCalls, 1);
});

test('定位到真实末尾不会因恢复播放而自动从零重播', (t) => {
  const s = setup(t, { durationMs: 5000 });
  s.timeline.seek(4.99);
  // 浏览器在seeked时可能尚未设置ended；不能在末尾调用play触发从零开始。
  s.video.emit('seeked');
  assert.equal(s.state().target, null);
  assert.equal(s.video.playCalls, 0);
});
