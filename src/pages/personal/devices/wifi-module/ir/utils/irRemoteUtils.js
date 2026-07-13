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
