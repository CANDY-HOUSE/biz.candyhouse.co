// 遥控器按键排序：keyOrder 是按键 id 的数组，存在后台 ir_device_key_order 表（分区键 = 遥控器 uuid）。
// 没有排序记录的遥控器（存量、没拖过）按面板默认顺序。
//
// 未保存的遥控器没有 uuid，拖曳结果先存在 sessionStorage 草稿里：
//   - 去自动匹配页（还会返回来）前调用 markKeyOrderDraftForReturn，返回后的页面据此恢复；
//   - 其他情况（直接退出、重新进入）不带「返回」标记，草稿在页面加载时被丢弃，拖曳结果不保留；
//   - 保存遥控器成功后，用保存得到的 uuid 把顺序写到后台，并清掉草稿。

const DRAFT_KEY = 'irDraftKeyOrder';
const DRAFT_MAX_AGE_MS = 10 * 60 * 1000;

// 把已保存的顺序合并进面板默认顺序：
// 已知 id 按保存的顺序在前；面板里有、保存里没有的（面板新增了按钮）按默认顺序追加；保存里有、面板里没有的忽略。
export const mergeKeyOrder = (defaultIds, savedOrder) => {
  if (!Array.isArray(savedOrder) || savedOrder.length === 0) return [...defaultIds];
  const known = new Set(defaultIds);
  const seen = new Set();
  const merged = [];
  savedOrder.forEach((id) => {
    if (known.has(id) && !seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  });
  defaultIds.forEach((id) => {
    if (!seen.has(id)) merged.push(id);
  });
  return merged;
};

export const sameOrder = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

const readDraft = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    const draft = raw ? JSON.parse(raw) : null;
    if (!draft || !Array.isArray(draft.keyOrder)) return null;
    return draft;
  } catch {
    return null;
  }
};

const writeDraft = (draft) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, ts: Date.now() }));
  } catch {
    // sessionStorage 不可用时，拖曳结果只在当前页面内有效
  }
};

export const clearKeyOrderDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
};

// 页面加载时调用：只有「从自动匹配页返回」的草稿才恢复，其余一律丢弃
export const loadKeyOrderDraftOnEnter = () => {
  const draft = readDraft();
  if (!draft) return null;
  const usable = draft.keep === true && Date.now() - (draft.ts || 0) < DRAFT_MAX_AGE_MS;
  if (!usable) {
    clearKeyOrderDraft();
    return null;
  }
  return { type: String(draft.type), keyOrder: draft.keyOrder };
};

// 页面加载并恢复草稿后调用：去掉「返回」标记，之后再进入就不会误用这份草稿
export const consumeKeyOrderDraft = () => {
  const draft = readDraft();
  if (draft) writeDraft({ ...draft, keep: false });
};

export const saveKeyOrderDraft = (type, keyOrder) => {
  if (!keyOrder || keyOrder.length === 0) {
    clearKeyOrderDraft();
    return;
  }
  writeDraft({ type: String(type), keyOrder, keep: false });
};

export const markKeyOrderDraftForReturn = (type, keyOrder) => {
  if (!keyOrder || keyOrder.length === 0) {
    clearKeyOrderDraft();
    return;
  }
  writeDraft({ type: String(type), keyOrder, keep: true });
};
