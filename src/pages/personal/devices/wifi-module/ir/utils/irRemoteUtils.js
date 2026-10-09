// utils/irRemoteUtils.js

/**
 * 根据遥控器的 code 返回来源标签（多语言）。
 * @param {object} item - 遥控器数据，至少包含 code 字段
 * @param {(key: string) => string} t - i18n 的翻译函数
 * @returns {string} 已翻译的来源文案
 */
export function getRemoteSource(item, t) {
  const code = item?.code ?? 0;
  if (code < 10000) {
    return t('pages.ir.list.fromHXD');
  } else if (code < 30000) {
    return t('pages.ir.list.fromIRremoteESP8266');
  }
  return t('pages.ir.list.fromSB');
}

/**
 * 空调温度可调范围（℃）。目前所有来源统一为 16~30℃
 * @param {object} _item - 遥控器数据（目前不区分来源，保留参数供以后按 code 区分）
 * @returns {{min: number, max: number}}
 */
export function getAirTempRange(_item) {
  return { min: 16, max: 30 };
}

/**
 * 把温度限制在该遥控器的可调范围内（非数字时回到 25℃）。
 * @param {number} temperature
 * @param {object} item - 遥控器数据
 * @returns {number}
 */
export function clampAirTemp(temperature, item) {
  const { min, max } = getAirTempRange(item);
  const t = Number(temperature);
  if (!Number.isFinite(t)) return 25;
  return Math.min(max, Math.max(min, t));
}
