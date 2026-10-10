// Keep these capabilities aligned with CHProductModel / DeviceProfiles in sesameSdk.
const profiles = {
  wm_2: [],
  bike_1: [],
  bike_2: [],
  bike_3: ['fingerprint'],
  ssm_touch: ['card', 'fingerprint'],
  ssm_touch_2: ['card', 'fingerprint'],
  ssm_touch_pro: ['card', 'fingerprint', 'passcode'],
  ssm_touch_2_pro: ['card', 'fingerprint', 'passcode'],
  sesame_face: ['card', 'fingerprint', 'face', 'palm'],
  sesame_face_2: ['card', 'fingerprint', 'face', 'palm'],
  sesame_face_3: ['card', 'fingerprint', 'face', 'palm'],
  sesame_face_Pro: ['card', 'fingerprint', 'passcode', 'face', 'palm'],
  ssm_face_2_pro: ['card', 'fingerprint', 'passcode', 'face', 'palm'],
  sesame_face_ai: ['face', 'palm'],
  sesame_face_2_ai: ['face', 'palm'],
  sesame_face_pro_ai: ['passcode', 'face', 'palm'],
  sesame_face_2_pro_ai: ['passcode', 'face', 'palm'],
  remote: [],
  remote_nano: [],
  open_sensor_1: [],
  open_sensor_2: [],
};
export const peripheralModels = Object.keys(profiles);
export const isPeripheralModel = (model) => Object.hasOwn(profiles, model);
export const peripheralCapabilities = (model) => profiles[model] || [];
export const isBike = (model) => ['bike_1', 'bike_2', 'bike_3'].includes(model);
export const isSleepy = (model) => ['remote_nano', 'open_sensor_1'].includes(model);
const newRadar = ['sesame_face_2', 'ssm_face_2_pro', 'sesame_face_2_ai', 'sesame_face_2_pro_ai'];
export const radarCommand = (model) => (newRadar.includes(model) ? 0x53 : 0x33);
const radarTable = (model) =>
  newRadar.includes(model)
    ? [
        [30, 65],
        [60, 50],
        [80, 36],
        [100, 30],
      ]
    : [
        [30, 116],
        [60, 44],
        [80, 31],
        [100, 23],
      ];
export const radarMaximumDistanceValue = (model) => radarTable(model)[3][1];
export const shouldFixLegacyRadarValue = (model, value) => value < radarMaximumDistanceValue(model);
// Direct port of SSMBiometricSettingFG. Kotlin uses Float (32-bit), roundToInt only below 30 cm,
// and truncation (toInt) for the other segments. Preserve both directions exactly.
const f32 = Math.fround;
export function radarValue(model, distance) {
  const cm = Math.max(0, Math.min(100, distance));
  const table = radarTable(model);
  const at30 = table[0][1];
  if (cm <= 30) {
    const ratio = f32(f32(cm) / f32(30));
    return Math.round(f32(512 + f32(ratio * (at30 - 512))));
  }
  if (cm >= 100) return radarMaximumDistanceValue(model);
  for (let i = 0; i < table.length - 1; i++) {
    const [dist1, fw1] = table[i],
      [dist2, fw2] = table[i + 1];
    if (cm >= dist1 && cm <= dist2) {
      const ratio = f32(f32(cm - dist1) / (dist2 - dist1));
      return Math.trunc(f32(fw1 + f32(ratio * (fw2 - fw1))));
    }
  }
  return at30;
}
export function radarDistance(model, value) {
  if (value >= 512) return 0;
  const table = radarTable(model);
  const at30 = table[0][1];
  const clamped = Math.max(radarMaximumDistanceValue(model), Math.min(512, value));
  if (clamped >= at30) {
    const ratio = f32(f32(512 - clamped) / (512 - at30));
    return Math.max(0, Math.min(30, Math.round(f32(ratio * f32(30)))));
  }
  for (let i = 0; i < table.length - 1; i++) {
    const [dist1, fw1] = table[i],
      [dist2, fw2] = table[i + 1];
    if (clamped >= fw2 && clamped <= fw1) {
      const ratio = f32(f32(clamped - fw2) / (fw1 - fw2));
      return Math.trunc(f32(dist2 + f32(ratio * (dist1 - dist2))));
    }
  }
  return 100;
}
export const credentialLabels = {
  card: 'manageCard',
  fingerprint: 'manageFingerprint',
  passcode: 'managePasscode',
  face: 'manageFace',
  palm: 'managePalmVeins',
};
export const credentialPrefix = (kind) => (kind === 'card' ? 'nfc_card' : kind);
export function credentialItem(item) {
  const raw = item.rawName || '';
  const hex = raw.replace(/-/g, '');
  const isUuid =
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(raw) ||
    /^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/i.test(hex);
  const nameUUID = isUuid
    ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase()
    : '';
  let name = '';
  if (!isUuid && /^(?:[0-9a-f]{2})+$/i.test(raw)) {
    name = new TextDecoder().decode(Uint8Array.from(raw.match(/../g), (n) => parseInt(n, 16))).replace(/\0+$/, '');
  }
  return { credentialId: item.credentialId, nameUUID, name, type: item.type };
}

export function credentialDisplayId(kind, id) {
  if (kind === 'card') {
    const hex = id.slice(0, 32).padEnd(32, 'f').toLowerCase();
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  if (kind === 'passcode') return [...id].filter((_, index) => index % 2 === 1).join('');
  return String(parseInt(id.slice(0, 2), 16) + (kind === 'fingerprint' ? 1 : 0)).padStart(3, '0');
}
