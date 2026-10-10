import { appOperation } from './appOperations';
import { credentialPrefix } from './peripheralSettings';

// Keep both request and alias-name response below a WebSocket frame, including multibyte names.
export function credentialChunks(items) {
  const chunks = [];
  let chunk = [],
    bytes = 2;
  for (const item of items) {
    const size = new TextEncoder().encode(JSON.stringify(item)).length + 1;
    if (chunk.length && (chunk.length >= 20 || bytes + size > 24000)) {
      chunks.push(chunk);
      chunk = [];
      bytes = 2;
    }
    if (size > 24000) throw new Error('Credential too large');
    chunk.push(item);
    bytes += size;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}
export async function syncCredentials({ deviceUUID, account, kind, previous, items, isCurrent, send = appOperation }) {
  const prefix = credentialPrefix(kind);
  const names = {};
  const request = async (operation, rows) => {
    if (!isCurrent()) throw new Error('Credential session changed');
    // The legacy API stores UTF-8 names in nameUUID until the first rename creates a UUID alias.
    const response = await send(
      'biometrics',
      {
        op: `${prefix}_${operation}`,
        items: rows.map((item) => ({ ...item, nameUUID: item.nameUUID || item.name, name: '' })),
      },
      { deviceUUID, account }
    );
    for (const row of response?.items || []) names[row.credentialId.toUpperCase()] = row.name;
  };
  if (previous === null) {
    const chunks = credentialChunks(items);
    await request('post', chunks.shift() || []);
    for (const chunk of chunks) await request('put', chunk);
  } else {
    const old = new Map(previous.map((item) => [item.credentialId, item]));
    const ids = new Set(items.map((item) => item.credentialId));
    const changed = items.filter((item) => JSON.stringify(old.get(item.credentialId)) !== JSON.stringify(item));
    const deleted = previous.filter((item) => !ids.has(item.credentialId));
    for (const chunk of credentialChunks(deleted)) await request('delete', chunk);
    for (const chunk of credentialChunks(changed)) await request('put', chunk);
  }
  return names;
}
