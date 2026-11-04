// utils/irMatterCommands.js
// 计算遥控器注册到 Matter 所需的「开 / 关」命令（hex）。
// 逻辑与 remote-air / remote-non-air 页面保存遥控器时一致，供不经过遥控器页面的场景使用（如列表里复制遥控器）。
import { HXDCommandProcessor } from './HXDCommandProcessor';
import { HXDParametersSwapper } from './HXDParametersSwapper';
import { clampAirTemp } from './irRemoteUtils.js';
import { IR_TYPE } from './irTypes.js';
import { getNonAirPowerOnKeyId, getNonAirPowerOffKeyId } from '../remote-non-air/keyIds.js';

// 与 remote-air 页面的初始状态一致
const DEFAULT_AIR_STATE = {
  power: false,
  temperature: 25,
  mode: 1,
  fanSpeed: 0,
  windDirection: 1,
  autoSwing: true,
};

const SELF_LEARNING_TYPE = 0xfe00;

const buildAirCommand = (processor, swapper, remote, state, keyType) =>
  processor
    .setKey(swapper.getAirKey(keyType))
    .setCode(remote.code)
    .setPower(state.power ? 0x01 : 0x00)
    .setTemperature(state.temperature)
    .setModel(swapper.getModeValue(state.mode))
    .setFanSpeed(swapper.getFanSpeedValue(state.fanSpeed))
    .setWindDirection(swapper.getWindDirectionValue(state.windDirection))
    .setAutoWindDirection(state.autoSwing ? 0x01 : 0x00)
    .buildAirCommand();

/**
 * @param {object} remote - 遥控器（至少含 type / code，空调还用到 state）
 * @returns {{cmdOn: string, cmdOff: string} | null} 自学习等不需要注册 Matter 的遥控器返回 null
 */
export const buildMatterPowerCommands = (remote) => {
  if (!remote || remote.code === undefined || remote.code === null) return null;
  const irType = parseInt(remote.type, 10);
  if (irType === SELF_LEARNING_TYPE) return null;

  const processor = new HXDCommandProcessor();
  try {
    if (irType === IR_TYPE.AIR) {
      const swapper = new HXDParametersSwapper();
      let state = { ...DEFAULT_AIR_STATE };
      if (remote.state) {
        const parsed = processor.parseAirCommand(remote.state);
        const uiState = parsed ? swapper.convertToUIState(parsed) : null;
        if (uiState) state = { ...uiState, temperature: clampAirTemp(uiState.temperature, remote) };
      }
      const on = buildAirCommand(processor, swapper, remote, { ...state, power: true }, 'POWER_STATUS_ON');
      const off = buildAirCommand(processor, swapper, remote, { ...state, power: false }, 'POWER_STATUS_OFF');
      return { cmdOn: processor.toHexString(on), cmdOff: processor.toHexString(off) };
    }

    const onKey = getNonAirPowerOnKeyId(irType, remote.code) ?? 0x01;
    const offKey = getNonAirPowerOffKeyId(irType, remote.code) ?? 0x01;
    const on = processor.setKey(onKey).setCode(remote.code).buildNonAirCommand();
    const cmdOn = processor.toHexString(on);
    const off = processor.setKey(offKey).setCode(remote.code).buildNonAirCommand();
    return { cmdOn, cmdOff: processor.toHexString(off) };
  } catch (error) {
    console.error('buildMatterPowerCommands error:', error);
    return null;
  }
};
