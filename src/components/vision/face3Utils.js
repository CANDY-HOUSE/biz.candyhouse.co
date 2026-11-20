import { isAppShell, requestNative } from '@/services/appBridge';
import { appHostSupports } from '@/services/appSession';

/**
 * Vision（Face3）几个页面共用的小工具（纯函数，不含 React 钩子）：
 *   - "多久以前"（relativeTime）
 *   - 实时画面拍照 / 录制后的取帧、编码与保存
 * AI 开关在 face3Context（首页和详情页共用一份状态）。
 */

/* ── 多久以前 ───────────────────────────────────────────────────────────── */

/**
 * 把 lastSeenAt 说成人话。Vision 首页卡片和详情页的「观看实时画面」按钮只要"多久以前"，
 * 不需要精确时刻。普通函数（t 由调用方传入），不必每张卡片多挂一个钩子。
 */
export const relativeTime = (t, ms) => {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 60_000) return t('face3.justNow');
  if (diff < 3600_000) return t('face3.minutesAgo', { n: Math.floor(diff / 60_000) });
  if (diff < 86400_000) return t('face3.hoursAgo', { n: Math.floor(diff / 3600_000) });
  return t('face3.daysAgo', { n: Math.floor(diff / 86400_000) });
};

/* ── 拍照 / 录制：取帧、编码与保存 ──────────────────────────────────────────
 * 实时画面来自 WebRTC 的 MediaStream（KVS / LiveKit 都是），画到 canvas 上不会"污染"，可以导出，
 * 也可以直接交给 MediaRecorder 录。 */

export const captureVideoFrame = (video) =>
  new Promise((resolve, reject) => {
    const width = video?.videoWidth;
    const height = video?.videoHeight;
    if (!width || !height) {
      reject(new Error('no_frame'));
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode_failed'))), 'image/jpeg', 0.92);
  });

/** Face3_<设备名>_<YYYYMMDD_HHmmss>.<扩展名>（设备名本身以 Face3 开头就不再加前缀），去掉文件名里不能用的字符 */
export const mediaFileName = (deviceName, extension, date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(
    date.getMinutes()
  )}${pad(date.getSeconds())}`;
  const name = String(deviceName || 'Face3')
    .replace(/[\\/:*?"<>|#%\s]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `${/^face3/i.test(name) ? '' : 'Face3_'}${name}_${stamp}.${extension}`;
};

/**
 * 录制用的容器 / 编码，按顺序取浏览器支持的第一个。
 * 优先 MP4(H.264)：相册、各平台播放器都认，且多数机器有硬件编码，4K 也录得动；
 * Safari 只有 MP4，Chrome 126+ 也支持；不行再退 WebM（Firefox、旧 Chrome）。
 */
const RECORDING_TYPES = [
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=h264,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export const canRecord = () => typeof window !== 'undefined' && typeof window.MediaRecorder === 'function';

export const recordingMimeTypes = () =>
  canRecord() ? RECORDING_TYPES.filter((type) => window.MediaRecorder.isTypeSupported?.(type)) : [];

export const extensionForMime = (mimeType) => (/mp4/i.test(mimeType || '') ? 'mp4' : 'webm');

/** APP 壳里存相册要壳提供对应接口；旧壳没有，提前告诉用户，免得录完才发现存不了 */
const NATIVE_SAVE_ACTION = { image: 'saveImage', video: 'saveVideo' };
export const canSaveMedia = (kind) => !isAppShell || appHostSupports(NATIVE_SAVE_ACTION[kind]);

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const download = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  /* 视频可能很大，多留一会儿再释放 */
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

/**
 * 保存照片 / 视频（kind: 'image' | 'video'），按环境选：
 *   APP 壳 —— 壳声明了 saveImage / saveVideo 能力就交给它存相册；旧壳没有这个接口，抛 'unsupported'
 *              （WebView 里 <a download> 和 blob 链接都不可靠，不去试）
 *   手机浏览器 —— 能分享文件就走系统分享面板（可选"存储图像 / 存储视频"）；用户取消会抛 AbortError。
 *                 分享要求刚有过点击（录制到时长上限自动停止时就没有），被拒则改为下载
 *   其余（PC 浏览器）—— 直接下载
 * 返回 'saved' | 'shared' | 'downloaded'。
 */
export async function saveMedia(blob, fileName, kind = 'image') {
  const mimeType = blob.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4');
  if (isAppShell) {
    if (!canSaveMedia(kind)) throw new Error('unsupported');
    await requestNative(NATIVE_SAVE_ACTION[kind], { fileName, mimeType, dataUrl: await blobToDataUrl(blob) });
    return 'saved';
  }
  const file = new File([blob], fileName, { type: mimeType });
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if (err?.name !== 'NotAllowedError') throw err;
    }
  }
  download(blob, fileName);
  return 'downloaded';
}
