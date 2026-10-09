// 遥控器列表与搜索结果的本地缓存（IndexedDB）。
//
// 作用：进入列表页立即显示上次的数据、同时向后台核对版本；从下一级页面返回时直接显示（含当时的搜索结果）。
// 两个 store，都以 irType 为键：
//   lists    { irType, dataVersion, remoteList, pagination, timestamp }
//   searches { irType, dataVersion, searchTerm, searchResults, timestamp }
// dataVersion 是后台数据版本（列表接口 ir_remote 返回，全品类共用一个），版本变了旧记录全部作废。
//
// 用 IndexedDB 而不是 localStorage：localStorage 每个站点约 5M 字符，电视、空调全量各约 2M，
// 放不下多个品类；IndexedDB 没有这个上限。
// 所有函数都不抛错：IndexedDB 不可用时读返回 null、写静默失败，页面按「没有缓存」处理。

const DB_NAME = 'biz3_ir_remote_list';
const DB_VERSION = 2;
const LISTS = 'lists';
const SEARCHES = 'searches';

let dbPromise = null;

const openDB = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        if (typeof indexedDB === 'undefined') return resolve(null);
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          [LISTS, SEARCHES].forEach((name) => {
            if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'irType' });
          });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
};

// 在一个事务里执行 fn(...stores)，事务完成后 resolve(fn 返回的 out.value)；任何失败 resolve(fallback)
const withStores = async (names, mode, fn, fallback = null) => {
  const db = await openDB();
  if (!db) return fallback;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(names, mode);
      const out = fn(...names.map((n) => tx.objectStore(n)));
      tx.oncomplete = () => resolve(out.value !== undefined ? out.value : fallback);
      tx.onerror = () => resolve(fallback);
      tx.onabort = () => resolve(fallback);
    } catch {
      resolve(fallback);
    }
  });
};

const getRecord = (name, irType) =>
  withStores([name], 'readonly', (store) => {
    const out = { value: undefined };
    const req = store.get(String(irType));
    req.onsuccess = () => {
      out.value = req.result ?? null;
    };
    return out;
  });

const putRecord = (name, record) =>
  withStores(
    [name],
    'readwrite',
    (store) => {
      store.put({ ...record, irType: String(record.irType), timestamp: Date.now() });
      return { value: true };
    },
    false
  );

const deleteRecord = (name, irType) =>
  withStores(
    [name],
    'readwrite',
    (store) => {
      store.delete(String(irType));
      return { value: true };
    },
    false
  );

export const getRemoteListCache = (irType) => getRecord(LISTS, irType);
export const putRemoteListCache = (record) => putRecord(LISTS, record);
export const deleteRemoteListCache = (irType) => deleteRecord(LISTS, irType);

export const getSearchCache = (irType) => getRecord(SEARCHES, irType);
export const putSearchCache = (record) => putRecord(SEARCHES, record);
export const deleteSearchCache = (irType) => deleteRecord(SEARCHES, irType);

// 两个 store 里不是 keepVersion 的记录全部清掉（keepVersion 为空则全部清掉）。数据版本全品类共用，
// 一个品类发现版本变了，其他品类的旧列表和旧搜索结果也一起作废。
export const purgeRemoteListCache = (keepVersion) =>
  withStores(
    [LISTS, SEARCHES],
    'readwrite',
    (...stores) => {
      stores.forEach((store) => {
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;
          if (!keepVersion || cursor.value.dataVersion !== keepVersion) {
            cursor.delete();
          }
          cursor.continue();
        };
      });
      return { value: true };
    },
    false
  );

// 旧版把列表和搜索结果存在 localStorage 的 remoteList_<irType>、remoteList_<irType>_search、
// remoteList_<irType>_searchTerm，改用 IndexedDB 后全部清掉释放空间。
export const removeLegacyLocalStorageLists = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => /^remoteList_\d+(_search|_searchTerm)?$/.test(key))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // 忽略
  }
};

// 本次会话里已经和后台核对过的版本：从下一级页面返回时，缓存版本与它一致就直接显示、不再请求
const verifiedKey = (irType) => `remoteListVerified_${irType}`;

export const markRemoteListVerified = (irType, dataVersion) => {
  try {
    if (dataVersion) sessionStorage.setItem(verifiedKey(irType), dataVersion);
  } catch {
    // 忽略
  }
};

export const isRemoteListVerified = (irType, dataVersion) => {
  try {
    return !!dataVersion && sessionStorage.getItem(verifiedKey(irType)) === dataVersion;
  } catch {
    return false;
  }
};
