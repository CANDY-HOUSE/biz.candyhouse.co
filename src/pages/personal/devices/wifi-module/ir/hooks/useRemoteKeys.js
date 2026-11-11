import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KEY_KIND,
  isPresetRow,
  upsertRow,
  fullPresetKeys,
  isRemoteKeysStored,
  loadKeyEditDraftOnEnter,
  consumeKeyEditDraft,
  saveKeyEditDraft,
  clearKeyEditDraft,
} from '../utils/remoteKeys.js';

// 预置按键刚全量写入时，按键 id 从面板 id 变成了 keyUUID：按 idMap 换成新的 id 再操作
const resolveKeyId = (item, data) => (item.kind === KEY_KIND.PRESET && data?.idMap?.[item.id]) || item.id;

/**
 * 遥控页的按键记录（全量存储）：非空调页、空调页、自学习页共用。合并成要显示的按键用 utils/remoteKeys.js 的 mergeRemoteKeys。
 *
 * @param {object}   p.remote        当前遥控器（有 type、keysStored）
 * @param {string}   p.hub3DeviceId
 * @param {string}   p.savedUuid     已保存遥控器的 uuid；未保存传空串
 * @param {object[]} p.panelItems    面板预置按键（全量写入时用）；自学习页传 []
 * @param {object}   p.api           useRemoteCtrl 的 { getRemoteKeys, storeRemoteKeys, renameRemoteKey, deleteRemoteKey }
 * @param {function} p.onStored      (data) => void  全量写入成功后调用：data.idMap（面板 id → keyUUID）用来换掉本地顺序里的面板 id，
 *                                   data.keyOrder 是后台转换后的顺序；同时同步本地遥控器列表的 keysStored
 * @param {boolean}  p.autoLoad      已保存时是否自动从后台取（自学习页自己控制取的时机，传 false 再调 reload）
 *
 * 全量写入的时机：保存遥控器（persistAfterSave）、第一次拖拽 / 增删改（ensureStored，已全量存储时什么都不做）。
 * 未保存的遥控器：只能改预置按键，先写草稿，保存时连同面板一起全量写入。
 */
export const useRemoteKeys = ({ remote, hub3DeviceId, savedUuid, panelItems, api, onStored, autoLoad = true }) => {
  const remoteType = String(remote?.type);
  // 只有从自动匹配页返回的草稿才恢复；必须在渲染期读，StrictMode 下重复渲染读到的是同一份
  const [draft] = useState(() => loadKeyEditDraftOnEnter());
  const [rows, setRows] = useState(() => (draft ? draft.rows : []));
  // 后台返回的「是否已全量存储」；还没取到时用遥控器自带的 keysStored
  const [storedFromServer, setStoredFromServer] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const stored = !!savedUuid && (storedFromServer ?? isRemoteKeysStored(remote));

  useEffect(() => {
    consumeKeyEditDraft();
  }, []);

  // 自动匹配后换成了别的品类（不会发生，保险起见）：草稿不适用
  useEffect(() => {
    if (draft && remote?.type !== undefined && String(draft.type) !== remoteType && !savedUuid) setRows([]);
  }, [draft, remoteType, savedUuid, remote?.type]);

  const latest = useRef({});
  latest.current = { api, hub3DeviceId, savedUuid, rows, remoteType, panelItems, stored, onStored };
  // 刚保存的遥控器：本地记录就是最新的（正在全量写入），不再去后台取，免得取回空列表把草稿冲掉
  const justSavedUuid = useRef('');
  // 正在全量写入时，后来的请求排队等这一次的结果
  const storing = useRef(null);

  const reload = useCallback((cb) => {
    const { api: a, hub3DeviceId: hub, savedUuid: uuid } = latest.current;
    if (!uuid || !hub) return;
    a.getRemoteKeys(hub, uuid, (response) => {
      if (response.success) {
        setRows(response.data?.keys || []);
        setStoredFromServer(!!response.data?.keysStored);
      }
      setLoaded(true);
      cb?.(response);
    });
  }, []);

  useEffect(() => {
    if (!autoLoad || !savedUuid || !hub3DeviceId || justSavedUuid.current === savedUuid) return;
    reload();
  }, [autoLoad, savedUuid, hub3DeviceId, reload]);

  // 全量写入：draftRows 是未保存时的草稿；keyOrder 是要一起转换写入的顺序（面板 id），不传就由后台转换线上已有的顺序。
  // done(success, data)：data = { idMap（面板 id → keyUUID）, keyOrder（转换后的顺序）, stored }
  const store = useCallback((uuid, draftRows, keyOrder, done) => {
    const { api: a, hub3DeviceId: hub, panelItems: panel, onStored: notify } = latest.current;
    if (storing.current) {
      storing.current.push(done);
      return;
    }
    const keys = fullPresetKeys(panel || [], draftRows);
    if (keys.length === 0) {
      // 面板还没加载（不会发生，保险起见）：不写，免得写出一个空集合
      done?.(false, null);
      return;
    }
    storing.current = [done];
    a.storeRemoteKeys(hub, uuid, keys, keyOrder || undefined, (response) => {
      const waiting = storing.current || [];
      storing.current = null;
      if (response.success) {
        // 以后台返回为准；本地刚学到、后台查询还没返回的学习按键保留（DynamoDB 查询是最终一致的）
        const keys = response.data?.keys || [];
        const ids = new Set(keys.map((row) => row.keyUUID));
        setRows((prev) => [...keys, ...prev.filter((row) => !isPresetRow(row) && !ids.has(row.keyUUID))]);
        setStoredFromServer(true);
        notify?.(response.data);
      }
      waiting.forEach((cb) => cb?.(response.success, response.success ? response.data : null));
    });
  }, []);

  /**
   * 已保存、还没全量存储的遥控器：先全量写入；已经全量存储（或未保存）时直接回调 done(true, null)。
   * done(success, data) 可选，data.idMap = 面板 id → keyUUID。keyOrder 可选：第一次拖拽时把拖完的顺序一起交给后台转换。
   * 拖拽、改名、删除、学到新按键之前调用。
   */
  const ensureStored = useCallback(
    (done, keyOrder) => {
      const { savedUuid: uuid, stored: isStored } = latest.current;
      if (!uuid || isStored) {
        done?.(true, null);
        return;
      }
      store(uuid, [], keyOrder, done);
    },
    [store]
  );

  const updateDraft = useCallback((next) => {
    setRows(next);
    saveKeyEditDraft(latest.current.remoteType, next);
  }, []);

  /**
   * 改名。item 是 mergeRemoteKeys 合并出来的按键（有 id、kind）。done(success) 可选。
   */
  const renameKey = useCallback(
    (item, name, done) => {
      const { savedUuid: uuid, rows: current } = latest.current;
      if (!uuid) {
        if (item.kind !== KEY_KIND.PRESET) return done?.(false);
        updateDraft(upsertRow(current, { keyUUID: item.id, kind: KEY_KIND.PRESET, name }));
        return done?.(true);
      }
      ensureStored((ok, data) => {
        if (!ok) return done?.(false);
        const { api: a, hub3DeviceId: hub } = latest.current;
        a.renameRemoteKey(hub, uuid, resolveKeyId(item, data), item.kind, name, (response) => {
          if (response.success && response.data?.key) {
            setRows((prev) => upsertRow(prev, response.data.key));
          }
          done?.(response.success);
        });
      });
    },
    [ensureStored, updateDraft]
  );

  /**
   * 删除：预置按键删掉这一行；学习按键连同学到的码一起删掉。done(success, keyId) 可选，keyId 是实际删掉的按键 id。
   */
  const deleteKey = useCallback(
    (item, done) => {
      const { savedUuid: uuid, rows: current } = latest.current;
      if (!uuid) {
        if (item.kind !== KEY_KIND.PRESET) return done?.(false);
        updateDraft(upsertRow(current, { keyUUID: item.id, kind: KEY_KIND.PRESET, hidden: true }));
        return done?.(true);
      }
      ensureStored((ok, data) => {
        if (!ok) return done?.(false);
        const { api: a, hub3DeviceId: hub } = latest.current;
        const keyId = resolveKeyId(item, data);
        a.deleteRemoteKey(hub, uuid, keyId, item.kind, (response) => {
          if (response.success) {
            setRows((prev) => prev.filter((row) => row.keyUUID !== keyId));
          }
          done?.(response.success, keyId);
        });
      });
    },
    [ensureStored, updateDraft]
  );

  // 学到新按键（addIRCode 成功后）：追加到本地，并确保预置按键已全量存储
  const addLearnedRow = useCallback(
    (row) => {
      setRows((prev) => [...prev.filter((item) => item.keyUUID !== row.keyUUID), row]);
      ensureStored();
    },
    [ensureStored]
  );

  // 保存遥控器成功后调用：把面板按键（套用草稿里的改名 / 删除）全量写到后台，并清掉草稿。
  // keyOrder：未保存时拖拽的顺序（面板 id），由后台一起转换成 keyUUID 写入；没拖过传 null。done(success, data)
  const persistAfterSave = useCallback(
    (uuid, keyOrder, done) => {
      const { rows: current } = latest.current;
      clearKeyEditDraft();
      justSavedUuid.current = uuid;
      setLoaded(true);
      store(uuid, current, keyOrder, done);
    },
    [store]
  );

  // 跳去自动匹配页前调用：返回后恢复草稿
  const keepForReturn = useCallback(() => {
    const { savedUuid: uuid, rows: current, remoteType: type } = latest.current;
    if (!uuid) saveKeyEditDraft(type, current, true);
  }, []);

  return {
    rows,
    stored,
    loaded,
    reload,
    setRows,
    ensureStored,
    renameKey,
    deleteKey,
    addLearnedRow,
    persistAfterSave,
    keepForReturn,
  };
};
