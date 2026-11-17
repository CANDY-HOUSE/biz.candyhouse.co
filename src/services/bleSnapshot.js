import { isAppShell } from './appBridge';
import { appOperation, webOperation } from './appOperations';
import { isPeripheralModel } from './peripheralSettings';

const settingKeys = [
  'lockPosition',
  'unlockPosition',
  'switchPoint',
  'autoLockSeconds',
  'sensorLockSeconds',
  'sensorInterval',
  'bleTxPower',
  'magnet',
];
const peripheralKeys = ['triggerDelay', 'radar', 'bound'];
const pick = (source, keys) =>
  Object.fromEntries(keys.filter((key) => source?.[key] !== undefined).map((key) => [key, source[key]]));

const sections = new Map();
const sent = new Map();
const timers = new Map();

function upload(key, deviceUUID, section) {
  timers.delete(key);
  const data = sections.get(key);
  const text = JSON.stringify(data);
  if (sent.get(key) === text) return;
  sent.set(key, text);
  appOperation('bleSnapshot', { section, data }, { deviceUUID }).catch(() => {
    if (sent.get(key) === text) sent.delete(key);
  });
}

// Values read over BLE in the APP are kept in the cloud so the web page can show them read-only.
export function rememberBleSnapshot(deviceUUID, section, data) {
  if (!isAppShell || !deviceUUID || !data) return;
  const key = `${deviceUUID.toUpperCase()}:${section}`;
  const merge = section === 'settings' || section === 'peripheral';
  const value = merge
    ? { ...sections.get(key), ...pick(data, section === 'settings' ? settingKeys : peripheralKeys) }
    : data;
  if (merge && !Object.keys(value).length) return;
  sections.set(key, value);
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(() => upload(key, deviceUUID, section), 2000)
  );
}

export function rememberBleSnapshotRows(rows) {
  rows.forEach((row) => {
    if (!row.bleConnected) return;
    rememberBleSnapshot(row.deviceUUID, 'settings', row.settings);
    const model = row.settings?.deviceModel;
    if (isPeripheralModel(model) && model !== 'wm_2') rememberBleSnapshot(row.deviceUUID, 'peripheral', row.peripheral);
    if (row.scripts?.length === 10)
      rememberBleSnapshot(row.deviceUUID, 'bot', {
        scriptIndex: row.scriptIndex ?? 0,
        scripts: row.scripts.map(({ id, name }) => ({ id, name })),
      });
  });
}

const reads = new Map();
export function loadBleSnapshot(deviceUUID) {
  const key = deviceUUID.toUpperCase();
  if (!reads.has(key))
    reads.set(
      key,
      webOperation('bleSnapshotGet', {}, key).finally(() => reads.delete(key))
    );
  return reads.get(key);
}

const credentialKinds = {
  card: 'nfc_card',
  fingerprint: 'fingerprint',
  passcode: 'passcode',
  face: 'face',
  palm: 'palm',
};
export const credentialTotal = (deviceUUID, kind) =>
  webOperation('credentialList', { kind: credentialKinds[kind], page: 0 }, deviceUUID.toUpperCase()).then(
    (data) => data.total
  );
export async function loadCredentials(deviceUUID, kind) {
  const items = [];
  for (let page = 0; ; page++) {
    const data = await webOperation('credentialList', { kind: credentialKinds[kind], page }, deviceUUID.toUpperCase());
    items.push(...data.items);
    if (!data.items.length || items.length >= data.total) return items;
  }
}
