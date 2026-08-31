/**
 * Face3 设备二维码的解析。
 *
 * 码面内容由 T32 生成（camera_T32/.../lvgl_gui_qr_code_page.c）：
 *
 *     ssm://UI?t=qr&qr=<base64(payload)>
 *
 * payload 固定 33 字节，正好 11 组三字节 -> 44 个 base64 字符、无填充：
 *
 *     [0]      机型，Face3 恒为 37
 *     [1..16]  did      —— 设备的 16 字节 UUID
 *     [17..32] qrUUID   —— 这张券的 16 字节 UUID
 *
 * 用的是标准 base64(RFC 4648, 字母表含 "+/")，与 T32 的编码端、
 * parse_uri.c 的解码端是同一张表。
 */

/** ssm.h: FACE_3 = 37 */
export const MODEL_FACE3 = 37;

const PAYLOAD_LEN = 33;

/** 16 字节 -> 云端使用的大写带横线 UUID，与 face3_devices.deviceId 同形 */
const bytesToUuid = (bytes) => {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)]
    .join('-')
    .toUpperCase();
};

/**
 * 从 App 透传过来的字符串里取出 base64 载荷。
 *
 * App 是把扫到的整串原样传过来的，所以这里可能拿到：
 *   - 完整 URI:  ssm://UI?t=qr&qr=<b64>
 *   - 只有载荷:  <b64>
 *
 * 还要处理一个 URL 层面的坑：标准 base64 含 "+"，而 "+" 在 query string 里
 * 是空格的转义。只要中途有一层没做 encodeURIComponent，"+" 就会变成空格。
 * 空格在 base64 字母表里不存在，所以把空格还原回 "+" 是安全的、无歧义的。
 * 顺带也接受 URL-safe 变体（-_），万一哪一层替我们转过码。
 */
const extractPayload = (raw) => {
  let s = String(raw).trim();
  const at = s.lastIndexOf('qr=');
  if (at >= 0) s = s.slice(at + 3);
  const amp = s.indexOf('&');
  if (amp >= 0) s = s.slice(0, amp);
  return s.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
};

const b64ToBytes = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
};

/**
 * 解析二维码内容。
 * @param {string} raw App 透传的原始字符串
 * @returns {{ok: true, model: number, did: string, qrUUID: string}
 *          |{ok: false, reason: string}}
 */
export const parseFace3Qr = (raw) => {
  if (!raw) return { ok: false, reason: 'empty' };

  const payload = extractPayload(raw);
  if (!/^[A-Za-z0-9+/]+=*$/.test(payload)) return { ok: false, reason: 'not_base64' };

  let bytes;
  try {
    bytes = b64ToBytes(payload);
  } catch {
    return { ok: false, reason: 'not_base64' };
  }

  if (bytes.length !== PAYLOAD_LEN) return { ok: false, reason: 'bad_length' };
  /* 机型不符说明扫到的是别的产品的码，交给别的分支处理，不该在这里绑定 */
  if (bytes[0] !== MODEL_FACE3) return { ok: false, reason: 'not_face3' };

  return {
    ok: true,
    model: bytes[0],
    did: bytesToUuid(bytes.slice(1, 17)),
    /* 云端 face3_qr 的分区键是小写形式 */
    qrUUID: bytesToUuid(bytes.slice(17, 33)).toLowerCase(),
  };
};

/**
 * 从 URL 查询参数里取出并解析二维码内容。
 *
 * 为什么不能只写 searchParams.get('qr')：
 * App 透传过来的是整串 `ssm://UI?t=qr&qr=<b64>`，里面自带一个 `&`。
 * 只要生成 H5 链接的某一层漏了 encodeURIComponent，浏览器就会把这个 `&`
 * 当成参数分隔符，于是 URL 里出现**两个** qr 参数：
 *
 *     ?qr=ssm://UI?t=qr  &  qr=<b64>
 *          ^ get('qr') 返回的是这个   ^ 真正的载荷在这里
 *
 * get() 只给第一个，载荷就丢了。所以逐个试 getAll('qr')，取第一个解得出的。
 * 编码正确时 getAll 只有一项，行为与 get 完全一致，没有额外代价。
 *
 * @param {URLSearchParams} searchParams
 */
export const parseFace3QrFromParams = (searchParams) => {
  const candidates = searchParams.getAll('qr');
  if (candidates.length === 0) return { ok: false, reason: 'empty' };

  let last = { ok: false, reason: 'empty' };
  for (const c of candidates) {
    const r = parseFace3Qr(c);
    if (r.ok) return r;
    last = r;
  }
  return last;
};
