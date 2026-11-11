// 遥控器按键（全量存储）：后台 ir_device_keys（经 ir_device_key lambda）一键一行：
//   - 预置按键：kind = 'preset'，keyUUID = 后台生成的 UUID，presetId = 面板按键 id（如 power、mode），name?（用户改过的名称）。
//     前端用 presetId 去面板找标题、图标、点击行为、发码键号；同一个 presetId 可以有多行
//   - 学习按键：kind = 'learned'（回填前的老数据没有 kind，同样按学习按键处理），keyUUID 是按键 id，name 是名称，
//     学到的码在 hub3_learned_ir_data
// 码库遥控器第一次需要时（保存、第一次拖拽、第一次增删改）才把面板全部按键写进后台，写完遥控器带 keysStored = true：
//   - 已全量存储：显示的预置按键 = 后台有的那些行（删除就是删掉那一行），按键 id 是 keyUUID，名称优先用改过的
//   - 还没全量存储：显示整个面板（和存量遥控器一样），按键 id 是面板 id
// 全量写入时后台会把按键顺序里的面板 id 换成 keyUUID，并返回 idMap（面板 id → keyUUID），前端用它更新本地顺序。
// 自学习遥控器（type 0xFE00）的按键全是学习按键，本来就是全量的。顺序另存在 ir_device_key_order（见 keyOrder.js）。
//
// 未保存的遥控器没有 uuid，改名 / 删除先存在 sessionStorage 草稿里（按面板 id 记 name / hidden），规则和按键排序的草稿一样：
//   去自动匹配页（还会返回来）前标记「返回」，返回后恢复；直接退出、重新进入不保留；保存时连同面板一起全量写到后台。

export const KEY_KIND = { PRESET: 'preset', LEARNED: 'learned' };

export const IR_TYPE_SELF_LEARNING = 0xfe00;

export const isPresetRow = (row) => row?.kind === KEY_KIND.PRESET;

// 遥控器的按键是否已全量存储
export const isRemoteKeysStored = (remote) =>
  parseInt(remote?.type, 10) === IR_TYPE_SELF_LEARNING || remote?.keysStored === true;

const ts = (row) => Number(row?.timestamp) || 0;

/**
 * 合并出要显示的按键。每个按键带 id（拖拽、改名、删除用）、kind、presetId（预置按键：对应的面板按键 id）。
 * @param {{id: string}[]} panelItems 面板预置按键（默认顺序；提供标题、图标、发码用的信息）
 * @param {object[]} rows 后台的按键记录；未保存的遥控器是草稿（keyUUID = 面板 id，name / hidden）
 * @param {boolean} stored 是否已全量存储
 * @param {string} learnedDefaultName 学习按键没有名称时显示的文字
 * @returns 预置按键在前（按面板顺序），学习按键按录入先后在后（带 irCode）
 */
export const mergeRemoteKeys = (panelItems, rows, stored, learnedDefaultName) => {
  const list = Array.isArray(rows) ? rows : [];
  let preset;
  if (stored) {
    // 已全量存储：每个预置行一个按键（id = keyUUID），用 presetId 找面板按键；面板里已经没有的忽略
    const panelIndex = new Map(panelItems.map((item, index) => [item.id, index]));
    preset = list
      .filter((row) => isPresetRow(row) && panelIndex.has(row.presetId))
      .sort((a, b) => panelIndex.get(a.presetId) - panelIndex.get(b.presetId) || ts(a) - ts(b))
      .map((row) => ({
        ...panelItems[panelIndex.get(row.presetId)],
        id: row.keyUUID,
        presetId: row.presetId,
        kind: KEY_KIND.PRESET,
        ...(row.name ? { customName: row.name } : {}),
      }));
  } else {
    // 还没全量存储：整个面板（id = 面板 id），去掉草稿里删除的，套用草稿里的名称
    const draft = new Map(list.filter(isPresetRow).map((row) => [row.keyUUID, row]));
    preset = panelItems
      .filter((item) => !draft.get(item.id)?.hidden)
      .map((item) => {
        const customName = draft.get(item.id)?.name;
        return { ...item, presetId: item.id, kind: KEY_KIND.PRESET, ...(customName ? { customName } : {}) };
      });
  }
  const learned = list
    .filter((row) => !isPresetRow(row) && row.keyUUID)
    .sort((a, b) => ts(a) - ts(b))
    .map((row) => ({
      id: row.keyUUID,
      kind: KEY_KIND.LEARNED,
      title: row.name || learnedDefaultName,
      customName: row.name || undefined,
      clickable: true,
      irCode: row,
    }));
  return [...preset, ...learned];
};

// 按 keyUUID 新增或覆盖一行
export const upsertRow = (rows, row) => {
  const index = rows.findIndex((item) => item.keyUUID === row.keyUUID);
  if (index < 0) return [...rows, row];
  const next = [...rows];
  next[index] = { ...rows[index], ...row };
  return next;
};

/**
 * 全量写入的预置按键（store 的参数）：面板全部按键，去掉草稿里删除的，带上草稿里改过的名称。
 * @returns {{presetId: string, name?: string}[]}
 */
export const fullPresetKeys = (panelItems, draftRows = []) => {
  const draft = new Map(draftRows.filter(isPresetRow).map((row) => [row.keyUUID, row]));
  return panelItems
    .filter((item) => !draft.get(item.id)?.hidden)
    .map((item) => {
      const name = draft.get(item.id)?.name;
      return { presetId: item.id, ...(name ? { name } : {}) };
    });
};

// 按 idMap（面板 id → keyUUID）把一组按键 id 换成 keyUUID，学习按键的 id 不变
export const mapKeyIds = (ids, idMap) => (Array.isArray(ids) ? ids.map((id) => idMap?.[id] ?? id) : ids);

const DRAFT_KEY = 'irDraftKeyEdits';
const DRAFT_MAX_AGE_MS = 10 * 60 * 1000;

const readDraft = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    const draft = raw ? JSON.parse(raw) : null;
    return draft && Array.isArray(draft.rows) ? draft : null;
  } catch {
    return null;
  }
};

const writeDraft = (draft) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, ts: Date.now() }));
  } catch {
    // sessionStorage 不可用时，草稿只在当前页面内有效
  }
};

export const clearKeyEditDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
};

// 页面加载时调用：只有「从自动匹配页返回」的草稿才恢复，其余一律丢弃
export const loadKeyEditDraftOnEnter = () => {
  const draft = readDraft();
  if (!draft) return null;
  if (draft.keep !== true || Date.now() - (draft.ts || 0) >= DRAFT_MAX_AGE_MS) {
    clearKeyEditDraft();
    return null;
  }
  return { type: String(draft.type), rows: draft.rows };
};

// 恢复草稿后调用：去掉「返回」标记，之后再进入就不会误用这份草稿
export const consumeKeyEditDraft = () => {
  const draft = readDraft();
  if (draft) writeDraft({ ...draft, keep: false });
};

export const saveKeyEditDraft = (type, rows, keep = false) => {
  if (!rows || rows.length === 0) {
    clearKeyEditDraft();
    return;
  }
  writeDraft({ type: String(type), rows, keep });
};
