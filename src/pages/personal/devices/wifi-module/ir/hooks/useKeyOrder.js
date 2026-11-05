import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  mergeKeyOrder,
  sameOrder,
  loadKeyOrderDraftOnEnter,
  consumeKeyOrderDraft,
  saveKeyOrderDraft,
  markKeyOrderDraftForReturn,
  clearKeyOrderDraft,
} from '../utils/keyOrder.js';

const PERSIST_DEBOUNCE_MS = 600;

/**
 * 遥控页的按键排序状态：非空调页、空调页共用。
 *
 * @param {object}   p.remote         当前遥控器（有 type、keyOrder）
 * @param {string}   p.savedUuid      已保存遥控器的 uuid；未保存传空串
 * @param {string[]} p.defaultIds     面板默认顺序的按键 id
 * @param {function} p.persist        (uuid, keyOrder) => void  把顺序写到后台（已保存的遥控器拖完后调用）
 * @param {function} p.onPersisted    (keyOrder) => void  可选，写后台时同步本地遥控器列表缓存
 * @param {string[]} p.serverOrder    可选，页面自己从后台取到的最新顺序；不传则用 remote.keyOrder（列表里带的）
 *
 * 已保存的遥控器：拖完防抖后写后台，离开页面时把还没写的立即写掉。
 * 未保存的遥控器：拖完只写 sessionStorage 草稿，保存成功后用 persistAfterSave 写后台。
 */
export const useKeyOrder = ({ remote, savedUuid, defaultIds, persist, onPersisted, serverOrder }) => {
  const remoteType = String(remote?.type);
  // 只有从自动匹配页返回的草稿才恢复；必须在渲染期读，StrictMode 下重复渲染读到的是同一份
  const [state, setState] = useState(() => {
    const draft = loadKeyOrderDraftOnEnter();
    return draft ? { order: draft.keyOrder, type: draft.type } : { order: [], type: null };
  });

  useEffect(() => {
    consumeKeyOrderDraft();
  }, []);

  // 已保存的遥控器以后台返回的 keyOrder 为准
  const latestServerOrder = serverOrder !== undefined ? serverOrder : remote?.keyOrder;
  // 用 layout effect：和按键列表同一次渲染里就换成后台的顺序，不会先按默认顺序画一帧
  useLayoutEffect(() => {
    if (savedUuid) setState({ order: latestServerOrder || [], type: remoteType });
  }, [savedUuid, latestServerOrder, remoteType]);

  // 自动匹配后换成了别的品类（不会发生，保险起见）：草稿不适用
  const savedOrder = state.type === null || state.type === remoteType ? state.order : [];
  const orderedIds = useMemo(() => mergeKeyOrder(defaultIds, savedOrder), [defaultIds, savedOrder]);

  const hasSavedOrder = useRef(false);
  hasSavedOrder.current = savedOrder.length > 0;
  const latest = useRef({});
  latest.current = { savedUuid, persist, onPersisted, orderedIds, remoteType };
  const pending = useRef(null); // { uuid, keyOrder }
  const timer = useRef(null);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    latest.current.persist?.(job.uuid, job.keyOrder);
    latest.current.onPersisted?.(job.keyOrder);
  }, []);

  useEffect(() => flush, [flush]); // 离开页面时写掉还没写的

  const handleReorder = useCallback(
    (newIds) => {
      if (sameOrder(newIds, latest.current.orderedIds)) return;
      setState({ order: newIds, type: latest.current.remoteType });
      if (latest.current.savedUuid) {
        pending.current = { uuid: latest.current.savedUuid, keyOrder: newIds };
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, PERSIST_DEBOUNCE_MS);
      } else {
        saveKeyOrderDraft(latest.current.remoteType, newIds);
      }
    },
    [flush]
  );

  // 保存遥控器成功后调用：拖过的话把顺序写到后台，并清掉草稿。返回写入的顺序（没拖过返回 null）。
  // remote 是页面上的遥控器对象，页面保存后会就地写入 uuid；这里同样写入 keyOrder，
  // 否则「已保存遥控器以 remote.keyOrder 为准」的同步会把刚拖的顺序冲掉。
  const persistAfterSave = useCallback(
    (uuid) => {
      const { orderedIds: ids, persist: doPersist } = latest.current;
      clearKeyOrderDraft();
      if (sameOrder(ids, defaultIds)) return null;
      remote.keyOrder = ids;
      doPersist?.(uuid, ids);
      return ids;
    },
    [defaultIds, remote]
  );

  // 删除了一个按键（自学习）：从已保存的顺序里去掉它并立即写后台；没有自定义顺序时不发请求。
  // 渲染时本来就会忽略已删除的按键，这一步只是让后台的记录保持干净。
  const removeKey = useCallback(
    (id) => {
      const { savedUuid: uuid, orderedIds: ids } = latest.current;
      if (!uuid || !hasSavedOrder.current) return;
      const next = ids.filter((item) => item !== id);
      setState({ order: next, type: latest.current.remoteType });
      pending.current = { uuid, keyOrder: next };
      flush();
    },
    [flush]
  );

  // 跳去自动匹配页前调用：返回后恢复拖曳结果
  const keepForReturn = useCallback(() => {
    markKeyOrderDraftForReturn(latest.current.remoteType, latest.current.orderedIds);
  }, []);

  return { orderedIds, handleReorder, persistAfterSave, keepForReturn, removeKey };
};
