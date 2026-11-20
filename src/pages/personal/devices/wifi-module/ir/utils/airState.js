import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded';
import AirRoundedIcon from '@mui/icons-material/AirRounded';
import AutoModeRoundedIcon from '@mui/icons-material/AutoModeRounded';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import { HXDCommandProcessor } from './HXDCommandProcessor';
import { HXDParametersSwapper } from './HXDParametersSwapper';
import { IR_TYPE } from './irTypes.js';
import { clampAirTemp } from './irRemoteUtils.js';

// 下标与空调页 currentState.mode 一致：0 自动、1 制冷、2 除湿、3 送风、4 制热；colors 为 [主色, 渐变深色]
export const AIR_MODES = [
  { titleKey: 'pages.ir.remote.autoMode', Icon: AutoModeRoundedIcon, colors: ['#28AEB1', '#1A8487'] },
  { titleKey: 'pages.ir.remote.coolMode', Icon: AcUnitRoundedIcon, colors: ['#3D8BFD', '#2463D1'] },
  { titleKey: 'pages.ir.remote.dehumidifyMode', Icon: WaterDropRoundedIcon, colors: ['#22A7C9', '#147C9B'] },
  { titleKey: 'pages.ir.remote.fanMode', Icon: AirRoundedIcon, colors: ['#3FAF7F', '#25835B'] },
  { titleKey: 'pages.ir.remote.heatMode', Icon: WbSunnyRoundedIcon, colors: ['#F2814B', '#D2582A'] },
];

export const AIR_FAN_SPEED_KEYS = [
  'pages.ir.remote.fanSpeedAuto',
  'pages.ir.remote.fanSpeedLow',
  'pages.ir.remote.fanSpeedMedium',
  'pages.ir.remote.fanSpeedHigh',
];

export const AIR_OFF_COLORS = ['#8E8E93', '#636366'];

// 与 remote-air 页面的初始状态一致
export const DEFAULT_AIR_STATE = {
  power: false,
  temperature: 25,
  mode: 1,
  fanSpeed: 0,
  windDirection: 1,
  autoSwing: true,
};

export const getAirMode = (mode) => AIR_MODES[mode] || AIR_MODES[1];

export const isAirRemote = (remote) => parseInt(remote?.type, 10) === IR_TYPE.AIR && remote?.code !== 0;

const processor = new HXDCommandProcessor();
const swapper = new HXDParametersSwapper();

/**
 * 从遥控器记录的 state（最近一次发出的空调指令）解析出界面状态，与空调页恢复状态的方式一致；
 * 还没发过指令（或解析不了）时与空调页一样用默认状态。
 * @returns {{power, temperature, mode, fanSpeed, windDirection, autoSwing} | null} 不是空调遥控器时为 null
 */
export const parseAirState = (remote) => {
  if (!isAirRemote(remote)) return null;
  const uiState = remote.state ? swapper.convertToUIState(processor.parseAirCommand(remote.state)) : null;
  if (!uiState) return DEFAULT_AIR_STATE;
  return { ...uiState, temperature: clampAirTemp(uiState.temperature, remote) };
};
