/**
 * HXD（宏芯达）遥控器的按键面板 —— code < 30000 的遥控器进遥控页时加载这份（见 panels/index.js）。
 *
 * 每个按钮对应 HXD 厂商码表（V8.b.cf.9-E）里该品类的一列：按钮 id → 键号（keyIds.js，1..N = 列号）。
 * 这里列全了每个品类的全部 N 列、每列一个按钮；某台遥控器在码表里该列为空（FF,00）时，点击后端返回 406，
 * 页面提示「该遥控器没有这个按键」。按钮顺序即界面顺序（3 列网格）。
 *
 * 键号映射的唯一真源是 ir_workspace/code/pipeline/ir_keys/key_spec.py；gen_ir_keys.py 会校验本文件：
 * 按钮 id 都要在规格里、键号都在 1..N、N 列全覆盖且不重复。
 */
import { IR_TYPE } from '../../utils/irTypes.js';

export const hxdPanels = {
  // 电视 0x2000（HXD 26 键）
  [IR_TYPE.TV]: (t) => [
    { id: 'power', title: t('pages.ir.remote.power') }, // 码表第 6 列（HXD 可用 99.6%）
    { id: 'mute', title: t('pages.ir.remote.mute') }, // 码表第 7 列（HXD 可用 98.7%）
    { id: 'volumeUp', title: t('pages.ir.remote.volumeUp') }, // 码表第 5 列（HXD 可用 99.4%）
    { id: 'volumeDown', title: t('pages.ir.remote.volumeDown') }, // 码表第 1 列（HXD 可用 99.3%）
    { id: 'channelUp', title: t('pages.ir.remote.channelUp') }, // 码表第 2 列（HXD 可用 98.7%）
    { id: 'channelDown', title: t('pages.ir.remote.channelDown') }, // 码表第 4 列（HXD 可用 98.5%）
    { id: 'up', title: t('pages.ir.remote.up') }, // 码表第 22 列（HXD 可用 95.6%）
    { id: 'left', title: t('pages.ir.remote.left') }, // 码表第 23 列（HXD 可用 95.2%）
    { id: 'ok', title: t('pages.ir.remote.ok') }, // 码表第 21 列（HXD 可用 73.4%）
    { id: 'right', title: t('pages.ir.remote.right') }, // 码表第 24 列（HXD 可用 95.4%）
    { id: 'down', title: t('pages.ir.remote.down') }, // 码表第 25 列（HXD 可用 95.7%）
    { id: 'menu', title: t('pages.ir.remote.menu') }, // 码表第 3 列（HXD 可用 93.0%）
    { id: 'back', title: t('pages.ir.remote.back') }, // 码表第 20 列（HXD 可用 84.1%）
    { id: 'home', title: t('pages.ir.remote.home') }, // 码表第 26 列（HXD 可用 6.5%）
    { id: 'avTv', title: 'AV/TV' }, // 码表第 19 列（HXD 可用 82.0%）
    { id: 'selectKey', title: '-/--' }, // 码表第 17 列（HXD 可用 76.2%）
    { id: 'number1', title: '1' }, // 码表第 8 列（HXD 可用 97.7%）
    { id: 'number2', title: '2' }, // 码表第 9 列（HXD 可用 97.7%）
    { id: 'number3', title: '3' }, // 码表第 10 列（HXD 可用 97.7%）
    { id: 'number4', title: '4' }, // 码表第 11 列（HXD 可用 97.7%）
    { id: 'number5', title: '5' }, // 码表第 12 列（HXD 可用 97.7%）
    { id: 'number6', title: '6' }, // 码表第 13 列（HXD 可用 97.7%）
    { id: 'number7', title: '7' }, // 码表第 14 列（HXD 可用 97.7%）
    { id: 'number8', title: '8' }, // 码表第 15 列（HXD 可用 97.1%）
    { id: 'number9', title: '9' }, // 码表第 16 列（HXD 可用 97.5%）
    { id: 'number0', title: '0' }, // 码表第 18 列（HXD 可用 97.1%）
  ],

  // 网络电视盒 0x2100（HXD 25 键）
  [IR_TYPE.IPTV]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbPower') }, // 码表第 1 列（HXD 可用 99.3%）
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // 码表第 2 列（HXD 可用 89.4%）
    { id: 'up', title: t('pages.ir.remote.up') }, // 码表第 7 列（HXD 可用 96.8%）
    { id: 'left', title: t('pages.ir.remote.left') }, // 码表第 8 列（HXD 可用 96.6%）
    { id: 'ok', title: t('pages.ir.remote.ok') }, // 码表第 9 列（HXD 可用 98.1%）
    { id: 'right', title: t('pages.ir.remote.right') }, // 码表第 10 列（HXD 可用 96.5%）
    { id: 'down', title: t('pages.ir.remote.down') }, // 码表第 11 列（HXD 可用 96.6%）
    { id: 'volumeUp', title: t('pages.ir.remote.sbVolPlus') }, // 码表第 3 列（HXD 可用 96.4%）
    { id: 'volumeDown', title: t('pages.ir.remote.sbVolLess') }, // 码表第 4 列（HXD 可用 96.8%）
    { id: 'channelUp', title: t('pages.ir.remote.channelUp') }, // 码表第 5 列（HXD 可用 91.0%）
    { id: 'channelDown', title: t('pages.ir.remote.channelDown') }, // 码表第 6 列（HXD 可用 91.2%）
    { id: 'play', title: t('pages.ir.remote.sbPlay') }, // 码表第 12 列（HXD 可用 83.1%）
    { id: 'menu', title: t('pages.ir.remote.sbHomeText') }, // 码表第 25 列（HXD 可用 91.1%）
    { id: 'home', title: t('pages.ir.remote.home') }, // 码表第 24 列（HXD 可用 95.8%）
    { id: 'back', title: t('pages.ir.remote.sbBack') }, // 码表第 23 列（HXD 可用 95.4%）
    { id: 'number1', title: '1' }, // 码表第 13 列（HXD 可用 92.5%）
    { id: 'number2', title: '2' }, // 码表第 14 列（HXD 可用 92.5%）
    { id: 'number3', title: '3' }, // 码表第 15 列（HXD 可用 92.0%）
    { id: 'number4', title: '4' }, // 码表第 16 列（HXD 可用 91.6%）
    { id: 'number5', title: '5' }, // 码表第 17 列（HXD 可用 91.4%）
    { id: 'number6', title: '6' }, // 码表第 18 列（HXD 可用 91.2%）
    { id: 'number7', title: '7' }, // 码表第 19 列（HXD 可用 91.2%）
    { id: 'number8', title: '8' }, // 码表第 20 列（HXD 可用 90.9%）
    { id: 'number9', title: '9' }, // 码表第 21 列（HXD 可用 90.7%）
    { id: 'number0', title: '0' }, // 码表第 22 列（HXD 可用 91.8%）
  ],

  // 数码相机 0x2300（HXD 1 键）
  [IR_TYPE.DC]: (t) => [
    { id: 'shutter', title: t('pages.ir.remote.sbShutter') }, // 码表第 1 列（HXD 可用 100.0%）
  ],

  // 空气净化器 0x2700（HXD 18 键）
  [IR_TYPE.AP]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbFanPower') }, // 码表第 1 列（HXD 可用 100.0%）
    { id: 'mode', title: t('pages.ir.remote.sbLgtMode') }, // 码表第 5 列（HXD 可用 45.0%）
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // 码表第 8 列（HXD 可用 35.0%）
    { id: 'airVolume', title: t('pages.ir.remote.airVolume') }, // 码表第 3 列（HXD 可用 80.0%）
    { id: 'anion', title: t('pages.ir.remote.sbIon') }, // 码表第 6 列（HXD 可用 70.0%）
    { id: 'autoRun', title: t('pages.ir.remote.sbAuto') }, // 码表第 2 列（HXD 可用 70.0%）
    { id: 'closeKey', title: t('pages.ir.remote.closeKey') }, // 码表第 12 列（HXD 可用 40.0%）
    { id: 'cozyMode', title: t('pages.ir.remote.sbRhythm') }, // 码表第 7 列（HXD 可用 45.0%）
    { id: 'strongMode', title: t('pages.ir.remote.strongMode') }, // 码表第 10 列（HXD 可用 45.0%）
    { id: 'ledOff', title: t('pages.ir.remote.ledOff') }, // 码表第 9 列（HXD 可用 40.0%）
    { id: 'light1', title: t('pages.ir.remote.light1') }, // 码表第 15 列（HXD 可用 45.0%）
    { id: 'light2', title: t('pages.ir.remote.light2') }, // 码表第 16 列（HXD 可用 45.0%）
    { id: 'light3', title: t('pages.ir.remote.light3') }, // 码表第 17 列（HXD 可用 45.0%）
    { id: 'natureMode', title: t('pages.ir.remote.natureMode') }, // 码表第 11 列（HXD 可用 40.0%）
    { id: 'schedule', title: t('pages.ir.remote.sbSchedule') }, // 码表第 4 列（HXD 可用 75.0%）
    { id: 'sleepMode', title: t('pages.ir.remote.sbSleep') }, // 码表第 13 列（HXD 可用 75.0%）
    { id: 'smartMode', title: t('pages.ir.remote.smartMode') }, // 码表第 14 列（HXD 可用 45.0%）
    { id: 'uvLamp', title: t('pages.ir.remote.uvLamp') }, // 码表第 18 列（HXD 可用 55.0%）
  ],

  // 音响 0x2900（HXD 18 键）
  [IR_TYPE.AUDIO]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbPower') }, // 码表第 6 列（HXD 可用 98.3%）
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // 码表第 8 列（HXD 可用 97.1%）
    { id: 'up', title: t('pages.ir.remote.up') }, // 码表第 2 列（HXD 可用 83.5%）
    { id: 'left', title: t('pages.ir.remote.left') }, // 码表第 1 列（HXD 可用 91.9%）
    { id: 'ok', title: t('pages.ir.remote.ok') }, // 码表第 3 列（HXD 可用 79.0%）
    { id: 'right', title: t('pages.ir.remote.right') }, // 码表第 5 列（HXD 可用 91.0%）
    { id: 'down', title: t('pages.ir.remote.down') }, // 码表第 4 列（HXD 可用 84.5%）
    { id: 'volumeUp', title: t('pages.ir.remote.sbVolPlus') }, // 码表第 7 列（HXD 可用 98.8%）
    { id: 'volumeDown', title: t('pages.ir.remote.sbVolLess') }, // 码表第 9 列（HXD 可用 98.5%）
    { id: 'play', title: t('pages.ir.remote.sbPlay') }, // 码表第 11 列（HXD 可用 76.2%）
    { id: 'pause', title: t('pages.ir.remote.sbPause') }, // 码表第 16 列（HXD 可用 74.6%）
    { id: 'stop', title: t('pages.ir.remote.sbStop') }, // 码表第 14 列（HXD 可用 75.0%）
    { id: 'fastRewind', title: t('pages.ir.remote.sbRewind') }, // 码表第 10 列（HXD 可用 71.0%）
    { id: 'fastForward', title: t('pages.ir.remote.sbForward') }, // 码表第 12 列（HXD 可用 71.6%）
    { id: 'previous', title: t('pages.ir.remote.sbLast') }, // 码表第 13 列（HXD 可用 70.5%）
    { id: 'next', title: t('pages.ir.remote.sbNext') }, // 码表第 15 列（HXD 可用 71.0%）
    { id: 'menu', title: t('pages.ir.remote.menu') }, // 码表第 17 列（HXD 可用 76.4%）
    { id: 'back', title: t('pages.ir.remote.sbBack') }, // 码表第 18 列（HXD 可用 73.8%）
  ],

  // 热水器 0x2F00（HXD 10 键）
  [IR_TYPE.HW]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbFanPower') }, // 码表第 1 列（HXD 可用 100.0%）
    { id: 'mode', title: t('pages.ir.remote.sbMode') }, // 码表第 5 列（HXD 可用 100.0%）
    { id: 'keepWarm', title: t('pages.ir.remote.sbWheaterWarm') }, // 码表第 10 列（HXD 可用 100.0%）
    { id: 'heating', title: t('pages.ir.remote.sbWheaterHeat') }, // 码表第 6 列（HXD 可用 95.0%）
    { id: 'schedule', title: t('pages.ir.remote.sbSchedule') }, // 码表第 8 列（HXD 可用 100.0%）
    { id: 'settings', title: t('pages.ir.remote.settings') }, // 码表第 2 列（HXD 可用 95.0%）
    { id: 'tempUp', title: t('pages.ir.remote.sbTempPlus') }, // 码表第 3 列（HXD 可用 100.0%）
    { id: 'tempDown', title: t('pages.ir.remote.sbTempLess') }, // 码表第 4 列（HXD 可用 100.0%）
    { id: 'timeKey', title: t('pages.ir.remote.timeKey') }, // 码表第 9 列（HXD 可用 100.0%）
    { id: 'timerKey', title: t('pages.ir.remote.timerKey') }, // 码表第 7 列（HXD 可用 95.0%）
  ],

  // 扫地机 0x3100（HXD 21 键）
  [IR_TYPE.ROBOT]: (t) => [
    { id: 'on', title: t('pages.ir.remote.sbFanOn') }, // 码表第 1 列（HXD 可用 100.0%）
    { id: 'off', title: t('pages.ir.remote.sbFanOff') }, // 码表第 2 列（HXD 可用 100.0%）
    { id: 'mode', title: t('pages.ir.remote.sbMode') }, // 码表第 9 列（HXD 可用 36.4%）
    { id: 'up', title: t('pages.ir.remote.up') }, // 码表第 3 列（HXD 可用 100.0%）
    { id: 'left', title: t('pages.ir.remote.left') }, // 码表第 5 列（HXD 可用 100.0%）
    { id: 'ok', title: t('pages.ir.remote.ok') }, // 码表第 7 列（HXD 可用 54.5%）
    { id: 'right', title: t('pages.ir.remote.right') }, // 码表第 6 列（HXD 可用 100.0%）
    { id: 'down', title: t('pages.ir.remote.down') }, // 码表第 4 列（HXD 可用 100.0%）
    { id: 'home', title: t('pages.ir.remote.home') }, // 码表第 10 列（HXD 可用 45.5%）
    { id: 'autoRun', title: t('pages.ir.remote.sbAuto') }, // 码表第 15 列（HXD 可用 54.5%）
    { id: 'charge', title: t('pages.ir.remote.sbCharge') }, // 码表第 8 列（HXD 可用 54.5%）
    { id: 'cleanKey', title: t('pages.ir.remote.cleanKey') }, // 码表第 18 列（HXD 可用 9.1%）
    { id: 'cornerClean', title: t('pages.ir.remote.cornerClean') }, // 码表第 13 列（HXD 可用 81.8%）
    { id: 'localClean', title: t('pages.ir.remote.localClean') }, // 码表第 14 列（HXD 可用 27.3%）
    { id: 'pointClean', title: t('pages.ir.remote.pointClean') }, // 码表第 16 列（HXD 可用 45.5%）
    { id: 'schedule', title: t('pages.ir.remote.sbSchedule') }, // 码表第 19 列（HXD 可用 36.4%）
    { id: 'sectionClean', title: t('pages.ir.remote.sectionClean') }, // 码表第 12 列（HXD 可用 45.5%）
    { id: 'segmentClean', title: t('pages.ir.remote.segmentClean') }, // 码表第 17 列（HXD 可用 36.4%）
    { id: 'cleanSpeed', title: t('pages.ir.remote.cleanSpeed') }, // 码表第 20 列（HXD 可用 18.2%）
    { id: 'timerKey', title: t('pages.ir.remote.timerKey') }, // 码表第 11 列（HXD 可用 63.6%）
    { id: 'settings', title: t('pages.ir.remote.settings') }, // 码表第 21 列（HXD 可用 9.1%）
  ],

  // 机顶盒 0x4000（HXD 23 键）
  [IR_TYPE.STB]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbPower') }, // 码表第 1 列（HXD 可用 99.8%）
    { id: 'up', title: t('pages.ir.remote.up') }, // 码表第 14 列（HXD 可用 98.8%）
    { id: 'left', title: t('pages.ir.remote.left') }, // 码表第 15 列（HXD 可用 97.6%）
    { id: 'ok', title: t('pages.ir.remote.ok') }, // 码表第 16 列（HXD 可用 96.7%）
    { id: 'right', title: t('pages.ir.remote.right') }, // 码表第 17 列（HXD 可用 97.7%）
    { id: 'down', title: t('pages.ir.remote.down') }, // 码表第 18 列（HXD 可用 98.9%）
    { id: 'volumeUp', title: t('pages.ir.remote.sbVolPlus') }, // 码表第 19 列（HXD 可用 97.4%）
    { id: 'volumeDown', title: t('pages.ir.remote.sbVolLess') }, // 码表第 20 列（HXD 可用 97.4%）
    { id: 'channelUp', title: t('pages.ir.remote.sbChannelPlus') }, // 码表第 21 列（HXD 可用 97.6%）
    { id: 'channelDown', title: t('pages.ir.remote.sbChannelLess') }, // 码表第 22 列（HXD 可用 97.7%）
    { id: 'menu', title: t('pages.ir.remote.sbHome') }, // 码表第 23 列（HXD 可用 92.5%）
    { id: 'back', title: t('pages.ir.remote.sbBack') }, // 码表第 13 列（HXD 可用 87.6%）
    { id: 'guide', title: t('pages.ir.remote.guide') }, // 码表第 11 列（HXD 可用 84.6%）
    { id: 'number1', title: '1' }, // 码表第 2 列（HXD 可用 99.2%）
    { id: 'number2', title: '2' }, // 码表第 3 列（HXD 可用 99.2%）
    { id: 'number3', title: '3' }, // 码表第 4 列（HXD 可用 99.2%）
    { id: 'number4', title: '4' }, // 码表第 5 列（HXD 可用 99.2%）
    { id: 'number5', title: '5' }, // 码表第 6 列（HXD 可用 99.1%）
    { id: 'number6', title: '6' }, // 码表第 7 列（HXD 可用 99.3%）
    { id: 'number7', title: '7' }, // 码表第 8 列（HXD 可用 99.3%）
    { id: 'number8', title: '8' }, // 码表第 9 列（HXD 可用 99.3%）
    { id: 'number9', title: '9' }, // 码表第 10 列（HXD 可用 99.2%）
    { id: 'number0', title: '0' }, // 码表第 12 列（HXD 可用 98.8%）
  ],

  // 影碟机 0x6000（HXD 19 键）
  [IR_TYPE.DVD]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbPower') }, // 码表第 6 列（HXD 可用 98.4%）
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // 码表第 7 列（HXD 可用 83.1%）
    { id: 'up', title: t('pages.ir.remote.up') }, // 码表第 2 列（HXD 可用 95.4%）
    { id: 'left', title: t('pages.ir.remote.left') }, // 码表第 1 列（HXD 可用 95.3%）
    { id: 'ok', title: t('pages.ir.remote.ok') }, // 码表第 3 列（HXD 可用 85.3%）
    { id: 'right', title: t('pages.ir.remote.right') }, // 码表第 5 列（HXD 可用 95.5%）
    { id: 'down', title: t('pages.ir.remote.down') }, // 码表第 4 列（HXD 可用 95.6%）
    { id: 'play', title: t('pages.ir.remote.sbPlay') }, // 码表第 9 列（HXD 可用 82.6%）
    { id: 'pause', title: t('pages.ir.remote.sbPause') }, // 码表第 15 列（HXD 可用 88.9%）
    { id: 'stop', title: t('pages.ir.remote.sbStop') }, // 码表第 12 列（HXD 可用 93.8%）
    { id: 'fastRewind', title: t('pages.ir.remote.sbRewind') }, // 码表第 8 列（HXD 可用 93.0%）
    { id: 'fastForward', title: t('pages.ir.remote.sbForward') }, // 码表第 10 列（HXD 可用 93.3%）
    { id: 'previous', title: t('pages.ir.remote.sbLast') }, // 码表第 11 列（HXD 可用 89.8%）
    { id: 'next', title: t('pages.ir.remote.sbNext') }, // 码表第 13 列（HXD 可用 92.4%）
    { id: 'menu', title: t('pages.ir.remote.sbMenuHome') }, // 码表第 18 列（HXD 可用 84.2%）
    { id: 'back', title: t('pages.ir.remote.sbBack') }, // 码表第 19 列（HXD 可用 85.8%）
    { id: 'format', title: t('pages.ir.remote.format') }, // 码表第 14 列（HXD 可用 73.7%）
    { id: 'eject', title: t('pages.ir.remote.sbEject') }, // 码表第 17 列（HXD 可用 79.0%）
    { id: 'titleKey', title: t('pages.ir.remote.titleKey') }, // 码表第 16 列（HXD 可用 74.0%）
  ],

  // 风扇 0x8000（HXD 22 键）
  [IR_TYPE.FANS]: (t) => [
    { id: 'power', title: t('pages.ir.remote.power') }, // 码表第 1 列（HXD 可用 99.8%）
    { id: 'fanSpeed', title: t('pages.ir.remote.fanSpeed') }, // 码表第 2 列（HXD 可用 92.3%）
    { id: 'headShake', title: t('pages.ir.remote.headShake') }, // 码表第 3 列（HXD 可用 92.7%）
    { id: 'mode', title: t('pages.ir.remote.mode') }, // 码表第 4 列（HXD 可用 81.7%）
    { id: 'timerKey', title: t('pages.ir.remote.sbLgtTimer') }, // 码表第 5 列（HXD 可用 92.3%）
    { id: 'lightKey', title: t('pages.ir.remote.lightKey') }, // 码表第 6 列（HXD 可用 45.6%）
    { id: 'anion', title: t('pages.ir.remote.sbIon') }, // 码表第 7 列（HXD 可用 42.0%）
    { id: 'sleepMode', title: t('pages.ir.remote.sleepMode') }, // 码表第 17 列（HXD 可用 46.6%）
    { id: 'coolKey', title: t('pages.ir.remote.coolKey') }, // 码表第 18 列（HXD 可用 48.8%）
    { id: 'airVolume', title: t('pages.ir.remote.airVolume') }, // 码表第 19 列（HXD 可用 44.0%）
    { id: 'lowSpeed', title: t('pages.ir.remote.lowSpeed') }, // 码表第 20 列（HXD 可用 44.3%）
    { id: 'mediumSpeed', title: t('pages.ir.remote.mediumSpeed') }, // 码表第 21 列（HXD 可用 43.4%）
    { id: 'highSpeed', title: t('pages.ir.remote.highSpeed') }, // 码表第 22 列（HXD 可用 44.1%）
    { id: 'number1', title: '1' }, // 码表第 8 列（HXD 可用 57.1%）
    { id: 'number2', title: '2' }, // 码表第 9 列（HXD 可用 57.5%）
    { id: 'number3', title: '3' }, // 码表第 10 列（HXD 可用 56.6%）
    { id: 'number4', title: '4' }, // 码表第 11 列（HXD 可用 54.8%）
    { id: 'number5', title: '5' }, // 码表第 12 列（HXD 可用 56.8%）
    { id: 'number6', title: '6' }, // 码表第 13 列（HXD 可用 56.4%）
    { id: 'number7', title: '7' }, // 码表第 14 列（HXD 可用 56.4%）
    { id: 'number8', title: '8' }, // 码表第 15 列（HXD 可用 56.6%）
    { id: 'number9', title: '9' }, // 码表第 16 列（HXD 可用 56.6%）
  ],

  // 投影仪 0xA000（HXD 22 键）
  [IR_TYPE.PJT]: (t) => [
    { id: 'on', title: t('pages.ir.remote.sbFanOn') }, // 码表第 1 列（HXD 可用 100.0%）
    { id: 'off', title: t('pages.ir.remote.sbFanOff') }, // 码表第 2 列（HXD 可用 100.0%）
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // 码表第 19 列（HXD 可用 85.8%）
    { id: 'up', title: t('pages.ir.remote.up') }, // 码表第 12 列（HXD 可用 99.0%）
    { id: 'left', title: t('pages.ir.remote.left') }, // 码表第 13 列（HXD 可用 98.3%）
    { id: 'ok', title: t('pages.ir.remote.ok') }, // 码表第 11 列（HXD 可用 94.0%）
    { id: 'right', title: t('pages.ir.remote.right') }, // 码表第 14 列（HXD 可用 98.6%）
    { id: 'down', title: t('pages.ir.remote.down') }, // 码表第 15 列（HXD 可用 98.8%）
    { id: 'volumeUp', title: t('pages.ir.remote.sbVolPlus') }, // 码表第 17 列（HXD 可用 88.3%）
    { id: 'volumeDown', title: t('pages.ir.remote.sbVolLess') }, // 码表第 18 列（HXD 可用 88.5%）
    { id: 'pause', title: t('pages.ir.remote.sbPause') }, // 码表第 21 列（HXD 可用 75.1%）
    { id: 'menu', title: t('pages.ir.remote.sbHome') }, // 码表第 10 列（HXD 可用 95.9%）
    { id: 'quit', title: t('pages.ir.remote.quit') }, // 码表第 16 列（HXD 可用 82.3%）
    { id: 'autoAdjust', title: t('pages.ir.remote.autoAdjust') }, // 码表第 20 列（HXD 可用 76.2%）
    { id: 'computerSource', title: t('pages.ir.remote.computerSource') }, // 码表第 3 列（HXD 可用 72.7%）
    { id: 'focusUp', title: t('pages.ir.remote.focusUp') }, // 码表第 6 列（HXD 可用 73.4%）
    { id: 'focusDown', title: t('pages.ir.remote.focusDown') }, // 码表第 7 列（HXD 可用 73.1%）
    { id: 'mcd', title: t('pages.ir.remote.mcd') }, // 码表第 22 列（HXD 可用 65.9%）
    { id: 'screenUp', title: t('pages.ir.remote.sbZoomIn') }, // 码表第 8 列（HXD 可用 77.0%）
    { id: 'screenDown', title: t('pages.ir.remote.sbZoomOut') }, // 码表第 9 列（HXD 可用 76.5%）
    { id: 'signalSource', title: t('pages.ir.remote.signalSource') }, // 码表第 5 列（HXD 可用 89.2%）
    { id: 'videoSource', title: t('pages.ir.remote.videoSource') }, // 码表第 4 列（HXD 可用 80.3%）
  ],

  // 灯 0xE000（HXD 20 键）
  [IR_TYPE.LIGHT]: (t) => [
    { id: 'openLight', title: t('pages.ir.remote.openLight') }, // 码表第 1 列（HXD 可用 99.9%）
    { id: 'closeLight', title: t('pages.ir.remote.closeLight') }, // 码表第 2 列（HXD 可用 99.9%）
    { id: 'brightnessUp', title: t('pages.ir.remote.brightnessUp') }, // 码表第 3 列（HXD 可用 98.8%）
    { id: 'brightnessDown', title: t('pages.ir.remote.brightnessDown') }, // 码表第 4 列（HXD 可用 98.8%）
    { id: 'colorTempUp', title: t('pages.ir.remote.colorTempUp') }, // 码表第 9 列（HXD 可用 96.0%）
    { id: 'colorTempDown', title: t('pages.ir.remote.colorTempDown') }, // 码表第 10 列（HXD 可用 96.1%）
    { id: 'mode', title: t('pages.ir.remote.mode') }, // 码表第 5 列（HXD 可用 97.3%）
    { id: 'settings', title: t('pages.ir.remote.sbRemoteSetting') }, // 码表第 6 列（HXD 可用 95.7%）
    { id: 'timeUp', title: t('pages.ir.remote.timeUp') }, // 码表第 7 列（HXD 可用 94.6%）
    { id: 'timeDown', title: t('pages.ir.remote.timeDown') }, // 码表第 8 列（HXD 可用 94.2%）
    { id: 'scene1', title: '1' }, // 码表第 11 列（HXD 可用 92.3%）
    { id: 'scene2', title: '2' }, // 码表第 12 列（HXD 可用 92.3%）
    { id: 'scene3', title: '3' }, // 码表第 13 列（HXD 可用 92.3%）
    { id: 'scene4', title: '4' }, // 码表第 14 列（HXD 可用 92.3%）
    { id: 'scene5', title: '5' }, // 码表第 15 列（HXD 可用 92.3%）
    { id: 'scene6', title: '6' }, // 码表第 16 列（HXD 可用 92.3%）
    { id: 'sceneA', title: 'A' }, // 码表第 17 列（HXD 可用 92.3%）
    { id: 'sceneB', title: 'B' }, // 码表第 18 列（HXD 可用 92.3%）
    { id: 'sceneC', title: 'C' }, // 码表第 19 列（HXD 可用 92.3%）
    { id: 'sceneD', title: 'D' }, // 码表第 20 列（HXD 可用 92.3%）
  ],
};
