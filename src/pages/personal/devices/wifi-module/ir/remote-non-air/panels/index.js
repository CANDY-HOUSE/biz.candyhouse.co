/**
 * 遥控器按键面板入口：按遥控器来源选面板，显示与发码仍是 remote-non-air/index.js 同一套代码。
 *
 *   code <  30000 → HXD 遥控器       → hxdPanels.js（码表的列）
 *   code >= 30000 → SwitchBot 遥控器 → switchbotPanels.js（SwitchBot 码库里有的键）
 *
 * 与列表页「来自 HXD / 来自 SB」、keyIds.js 的 isNonAirKeyAvailable、后端取码走哪张表是同一条 code 规则。
 */
import { hxdPanels } from './hxdPanels.js';
import { switchbotPanels } from './switchbotPanels.js';

const COLS = 3;

export const isSwitchBotRemote = (code) => parseInt(code, 10) >= 30000;

// 返回带网格位置的按钮列表 [{ id, title, position: { row, col }, clickable }]；未知品类返回 []
export const getRemotePanel = (irType, code, t) => {
  const panels = isSwitchBotRemote(code) ? switchbotPanels : hxdPanels;
  const define = panels[parseInt(irType, 10)];
  if (!define) return [];
  return define(t).map((item, index) => ({
    ...item,
    position: { row: Math.floor(index / COLS), col: index % COLS },
    clickable: true,
  }));
};
