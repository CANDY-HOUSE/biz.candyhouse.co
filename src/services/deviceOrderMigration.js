import { appOperation } from './appOperations';

const pending = new Map();
const completed = new Set();

// Match native: once per account, only mark success, then reload the complete device list.
export async function migrateDeviceOrder(account, send = appOperation, storage = localStorage) {
  if (!account || completed.has(account)) return false;
  const key = `orderKeyMigrated_${account}`;
  try {
    if (storage.getItem(key) === 'true') return false;
  } catch (_) {
    /* Storage can be unavailable. */
  }
  if (pending.has(account)) return pending.get(account);
  const migration = (async () => {
    await send('mergeDeviceOrder', {}, { account });
    completed.add(account);
    try {
      storage.setItem(key, 'true');
    } catch (_) {
      /* Keep the successful flag for this session. */
    }
    return true;
  })();
  pending.set(account, migration);
  try {
    return await migration;
  } finally {
    pending.delete(account);
  }
}
