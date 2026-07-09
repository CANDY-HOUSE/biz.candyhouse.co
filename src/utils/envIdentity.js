import { Buffer } from 'buffer';

// Web 端环境标识：
// - envId：后端根据 subUUID + identifyId 稳定生成后回传（带横线 UUID），缓存下来供开锁历史标签使用。
const IDENTIFY_KEY = 'web_identify_id';
const ENVID_KEY = 'web_env_id';
const IDB_NAME = 'web_identify';
const IDB_STORE = 'kv';

// 预发/临时域名（含该标识）不上报，其余环境均上报
const ENV_REPORT_BLOCK_HOST = 'd36dwtby1bef9y';
export const isEnvReportEnabled = () =>
  typeof window !== 'undefined' && !window.location.hostname.includes(ENV_REPORT_BLOCK_HOST);

// localStorage 存取封装（无痕/配额满/禁用存储等情况下会抛错，统一在此兑底）
const lsGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 忽略：localStorage 不可用时退化为本次会话内有效
  }
};

// 最小 IndexedDB 键值读写（均带兼容性兑底，失败不报错）
const idbGet = (key) =>
  new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        try {
          const g = req.result.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
          g.onsuccess = () => resolve(g.result ?? null);
          g.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });

const idbSet = (key, value) => {
  try {
    if (typeof indexedDB === 'undefined') return;
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => {
      try {
        req.result.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
      } catch {
        // 忽略
      }
    };
  } catch {
    // 忽略
  }
};

const identifyReady = (async () => {
  const ls = lsGet(IDENTIFY_KEY);
  const idb = await idbGet(IDENTIFY_KEY);
  if (idb && !ls) {
    // localStorage 被清（如登出）但 IndexedDB 仍在 → 恢复
    lsSet(IDENTIFY_KEY, idb);
  }
})();

// 以下值为异步获取，模块加载时预取并缓存，collectEnvInfo 同步读取
let gVersion = ''; // version.json 的 version
let gBuild = ''; // version.json 的 gitHash

if (typeof fetch === 'function') {
  fetch('/version.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data) {
        gVersion = data.version || '';
        gBuild = data.gitHash || '';
      }
    })
    .catch(() => {});
}

// 从 UA 粗略解析操作系统名与版本
const parseOS = (ua) => {
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const m = ua.match(/OS (\d+[_.]\d+(?:[_.]\d+)?)/);
    return { name: 'iOS', version: m ? m[1].replace(/_/g, '.') : '' };
  }
  if (/Android/i.test(ua)) {
    const m = ua.match(/Android (\d+(?:\.\d+)*)/);
    return { name: 'Android', version: m ? m[1] : '' };
  }
  if (/Mac OS X/i.test(ua)) {
    const m = ua.match(/Mac OS X (\d+[_.]\d+(?:[_.]\d+)?)/);
    return { name: 'macOS', version: m ? m[1].replace(/_/g, '.') : '' };
  }
  if (/Windows NT/i.test(ua)) {
    const m = ua.match(/Windows NT (\d+\.\d+)/);
    return { name: 'Windows', version: m ? m[1] : '' };
  }
  if (/Linux/i.test(ua)) return { name: 'Linux', version: '' };
  return { name: '', version: '' };
};

// 从 UA 解析浏览器名与版本（Safari/Firefox/IE 无 userAgentData 时的兜底）
const parseBrowser = (ua) => {
  // 注意顺序：Edge/Opera 的 UA 也含 Chrome/Safari 关键字，需先判断
  let m;
  // IE：11 用 Trident + rv:，10 及以下用 MSIE
  if ((m = ua.match(/Trident\/.*rv:(\d+(?:\.\d+)*)/)) || (m = ua.match(/MSIE (\d+(?:\.\d+)*)/)))
    return { name: 'IE', version: m[1] };
  if ((m = ua.match(/Edg(?:e|A|iOS)?\/(\d+(?:\.\d+)*)/))) return { name: 'Edge', version: m[1] };
  if ((m = ua.match(/OPR\/(\d+(?:\.\d+)*)/)) || (m = ua.match(/Opera\/(\d+(?:\.\d+)*)/)))
    return { name: 'Opera', version: m[1] };
  if ((m = ua.match(/Firefox\/(\d+(?:\.\d+)*)/)) || (m = ua.match(/FxiOS\/(\d+(?:\.\d+)*)/)))
    return { name: 'Firefox', version: m[1] };
  if ((m = ua.match(/(?:Chrome|CriOS)\/(\d+(?:\.\d+)*)/))) return { name: 'Chrome', version: m[1] };
  if (/Safari/i.test(ua) && (m = ua.match(/Version\/(\d+(?:\.\d+)*)/))) return { name: 'Safari', version: m[1] };
  return { name: '', version: '' };
};

// 格式化为 "YYYY-MM-DD HH:mm:ss"（本地时间）
const formatCollectedAt = (date = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(
    date.getMinutes()
  )}:${p(date.getSeconds())}`;
};

const genUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 兜底：无 crypto.randomUUID 时用随机字节拼 UUID v4
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// 取得（或首次生成并持久化）web 端 identifyId
export const getIdentifyId = () => {
  let id = lsGet(IDENTIFY_KEY);
  if (!id) {
    id = genUuid();
    lsSet(IDENTIFY_KEY, id);
  }
  idbSet(IDENTIFY_KEY, id); // 同步写入 IndexedDB 做持久备份
  return id;
};

// 异步取得 identifyId：先 await 启动时的 IndexedDB 恢复，确保即使 localStorage 被清（登出/手动）
// 也能从 IndexedDB 恢复出同一个值，而不会错误地重新生成。
export const ensureIdentifyId = async () => {
  try {
    await identifyReady; // 等待启动时的恢复/迁移完成
  } catch {
    // 忽略
  }
  let id = lsGet(IDENTIFY_KEY);
  if (!id) {
    // localStorage 仍无值（启动恢复后又被清），再直接查一次 IndexedDB
    id = await idbGet(IDENTIFY_KEY);
    if (id) {
      lsSet(IDENTIFY_KEY, id);
    }
  }
  if (!id) {
    // 确实首次：生成并双写
    id = genUuid();
    lsSet(IDENTIFY_KEY, id);
  }
  idbSet(IDENTIFY_KEY, id);
  return id;
};

// 缓存后端回传的 envId
export const setEnvId = (envId) => {
  if (!envId) return;
  lsSet(ENVID_KEY, envId);
};

// 读取缓存的 envId（尚未取得时返回 null）
export const getEnvId = () => lsGet(ENVID_KEY);

// 采集 web 端环境信息，随 currentInfo 请求上报。
// 字段对齐 App 上报格式：单键对象数组（identifyId 供后端维护 envId 用）。
export const collectEnvInfo = () => {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const ua = nav.userAgent || '';
  const uaData = nav.userAgentData;
  const brand = uaData?.brands?.find((b) => !/Not.?A.?Brand/i.test(b.brand));
  // Chromium 有 userAgentData，Safari/Firefox 没有 —— 用 UA 解析兜底
  const browser = brand ? { name: brand.brand, version: brand.version } : parseBrowser(ua);
  const os = parseOS(ua);
  const language = nav.language || '';
  const region = (() => {
    try {
      return new Intl.Locale(language).region || language.split('-').pop() || '';
    } catch {
      return language.split('-').pop() || '';
    }
  })();
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const screenObj = typeof window !== 'undefined' ? window.screen || {} : {};
  const timeZone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  })();

  return [
    { displayName: browser.name || 'Biz3' },
    { version: gVersion },
    { build: gBuild },
    { language },
    { region },
    { bundleId: typeof window !== 'undefined' ? window.location.hostname : '' },
    { systemName: os.name },
    { systemVersion: os.version },
    { model: browser.name ? `${browser.name} ${browser.version}`.trim() : ua },
    { deviceType: isMobile ? 'phone' : 'desktop' },
    { screenWidth: screenObj.width || 0 },
    { screenHeight: screenObj.height || 0 },
    { screenScale: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1 },
    { timeZone },
    { collectedAt: formatCollectedAt() },
  ];
};
