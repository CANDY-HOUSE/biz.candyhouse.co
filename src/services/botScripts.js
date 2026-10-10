import { appOperation } from './appOperations';

export const isScriptBotModel = (model) => ['bot_2', 'bot_3'].includes(model);
export const isBotModel = (model) => ['ssmbot_1', 'bot_2', 'bot_3'].includes(model);
export const botScriptRows = (metadata = [], names = []) =>
  Array.from({ length: 10 }, (_, id) => {
    const item = metadata.find((row) => Number(row.actionIndex) === id);
    return {
      id,
      name: item?.alias || `🎬 ${names[id]?.name || id}`,
      displayOrder: item?.displayOrder ?? id,
      isDefault: item?.isDefault === 1,
    };
  }).sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
export const saveBotScript = (deviceUUID, body) => appOperation('botScript', body, { deviceUUID });
const initializing = new Map();
export function initializeBotScripts(deviceUUID, metadata, currentIndex = 0, reset = false) {
  const key = deviceUUID.toUpperCase();
  if (initializing.has(key)) return initializing.get(key);
  const task = (async () => {
    if (reset) await saveBotScript(key, { deleteAll: true });
    const rows = Array.from({ length: 10 }, (_, id) => {
      const old = reset ? null : metadata.find((row) => Number(row.actionIndex) === id);
      return {
        actionIndex: String(id),
        alias: old?.alias || `🎬 ${id}`,
        displayOrder: old?.displayOrder ?? id,
        isDefault: old?.isDefault ?? (id === currentIndex ? 1 : 0),
      };
    });
    for (const row of rows) {
      const old = reset ? null : metadata.find((item) => item.actionIndex === row.actionIndex);
      if (!old?.alias || old.displayOrder == null || old.isDefault == null) await saveBotScript(key, row);
    }
    return rows;
  })().finally(() => initializing.delete(key));
  initializing.set(key, task);
  return task;
}
