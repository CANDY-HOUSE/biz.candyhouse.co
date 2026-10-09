/**
 * SwitchBot 遥控器的按键面板 —— code >= 30000 的遥控器进遥控页时加载这份（见 panels/index.js）。
 *
 * 只列 SwitchBot 码库里实际出现过的按键：按钮 id → 键号 → 候选 tag（keyIds.js / key_spec.py），
 * 码库来自逆向导出（ir_workspace/data/03-index/sb/<品类>/wave_data.json）；App 面板定义了、但码库里一台都没有的键不列。
 * 以品类为单位：个别遥控器缺某个键时，点击后端返回 406，页面提示「该遥控器没有这个按键」。
 * 注释里的「覆盖」= 该品类 SwitchBot 遥控器里有这个键的比例。按钮顺序即界面顺序（3 列网格）。
 *
 * 键号映射的唯一真源是 ir_workspace/code/pipeline/ir_keys/key_spec.py；gen_ir_keys.py 会校验本文件：
 * 按钮 id 都要在规格里、SwitchBot 有数据的键全覆盖且不重复。
 */
import { IR_TYPE } from '../../utils/irTypes.js';

export const switchbotPanels = {
  // 电视 0x2000（SwitchBot 48 键）
  [IR_TYPE.TV]: (t) => [
    { id: 'power', title: t('pages.ir.remote.power') }, // Power，tag 11，覆盖 98.9%
    { id: 'mute', title: t('pages.ir.remote.mute') }, // Mute，tag 13，覆盖 97.4%
    { id: 'volumeUp', title: t('pages.ir.remote.volumeUp') }, // VolumeAdd，tag 9，覆盖 97.9%
    { id: 'volumeDown', title: t('pages.ir.remote.volumeDown') }, // VolumeDelete，tag 1，覆盖 97.8%
    { id: 'channelUp', title: t('pages.ir.remote.channelUp') }, // ChannelAdd，tag 3，覆盖 96.2%
    { id: 'channelDown', title: t('pages.ir.remote.channelDown') }, // ChannelDelete，tag 7，覆盖 95.6%
    { id: 'up', title: t('pages.ir.remote.up') }, // UP，tag 43，覆盖 94.2%
    { id: 'left', title: t('pages.ir.remote.left') }, // Left，tag 45，覆盖 97.3%
    { id: 'ok', title: t('pages.ir.remote.ok') }, // OK，tag 41，覆盖 93.3%
    { id: 'right', title: t('pages.ir.remote.right') }, // Right，tag 47，覆盖 97.3%
    { id: 'down', title: t('pages.ir.remote.down') }, // Down，tag 49，覆盖 97.4%
    { id: 'menu', title: t('pages.ir.remote.menu') }, // Menu，tag 5，覆盖 86.6%
    { id: 'back', title: t('pages.ir.remote.back') }, // Back，tag 39，覆盖 74.2%
    { id: 'home', title: t('pages.ir.remote.home') }, // ホーム，tag 20010，覆盖 0.2%
    { id: 'signalSource', title: t('pages.ir.remote.sbSource') }, // Input，tag 57，覆盖 49.7%
    { id: 'avTv', title: 'AV/TV' }, // AV_TV，tag 37，覆盖 6.4%
    { id: 'selectKey', title: '-/--' }, // Res，tag 33，覆盖 5.7%
    { id: 'play', title: t('pages.ir.remote.sbPlay') }, // Play，tag 34，覆盖 59.1%
    { id: 'pause', title: t('pages.ir.remote.sbPause') }, // Pause，tag 40，覆盖 57.5%
    { id: 'stop', title: t('pages.ir.remote.sbStop') }, // Stop，tag 46，覆盖 52.0%
    { id: 'fastRewind', title: t('pages.ir.remote.sbRewind') }, // FastReverse/巻き戻し，tag 32,20012，覆盖 49.9%
    { id: 'fastForward', title: t('pages.ir.remote.sbForward') }, // FastForward，tag 36，覆盖 49.1%
    { id: 'record', title: t('pages.ir.remote.sbRecord') }, // Record/録画，tag 44,20018，覆盖 37.2%
    { id: 'programList', title: t('pages.ir.remote.programList') }, // 番組表，tag 20011，覆盖 0.6%
    { id: 'dataKey', title: t('pages.ir.remote.sbData') }, // データ放送(d)，tag 20005，覆盖 0.7%
    { id: 'subtitle', title: t('pages.ir.remote.subtitle') }, // 字幕，tag 20001，覆盖 0.5%
    { id: 'audioTrack', title: t('pages.ir.remote.sbAudio') }, // 音声切換，tag 20000，覆盖 0.7%
    { id: 'displayKey', title: t('pages.ir.remote.displayKey') }, // インフォメーション(AQUOS INFO)，tag 20074，覆盖 0.0%
    { id: 'bs', title: t('pages.ir.remote.sbBs') }, // BS，tag 20003，覆盖 0.6%
    { id: 'cs', title: t('pages.ir.remote.cs') }, // CS，tag 20004，覆盖 0.6%
    { id: 'dttv', title: t('pages.ir.remote.sbDttv') }, // 地デジ/デジタル，tag 20002，覆盖 0.7%
    { id: 'colorRed', title: t('pages.ir.remote.sbRed') }, // Red/赤，tag 12,20007，覆盖 46.7%
    { id: 'colorGreen', title: t('pages.ir.remote.sbGreen') }, // Green/緑，tag 14,20008，覆盖 50.1%
    { id: 'colorYellow', title: t('pages.ir.remote.sbYellow') }, // Yellow/黄，tag 16,20009，覆盖 49.9%
    { id: 'colorBlue', title: t('pages.ir.remote.sbBlue') }, // Blue/青，tag 10,20006，覆盖 51.1%
    { id: 'number1', title: '1' }, // Number1，tag 15，覆盖 87.9%
    { id: 'number2', title: '2' }, // Number2，tag 17，覆盖 87.9%
    { id: 'number3', title: '3' }, // Number3，tag 19，覆盖 87.9%
    { id: 'number4', title: '4' }, // Number4，tag 21，覆盖 87.9%
    { id: 'number5', title: '5' }, // Number5，tag 23，覆盖 87.8%
    { id: 'number6', title: '6' }, // Number6，tag 25，覆盖 88.1%
    { id: 'number7', title: '7' }, // Number7，tag 27，覆盖 88.1%
    { id: 'number8', title: '8' }, // Number8，tag 29，覆盖 88.1%
    { id: 'number9', title: '9' }, // Number9，tag 31，覆盖 88.0%
    { id: 'number0', title: '0' }, // 0，tag 35，覆盖 29.4%
    { id: 'number10', title: '10' }, // Number10，tag 51，覆盖 58.5%
    { id: 'number11', title: '11' }, // Number11，tag 53，覆盖 0.7%
    { id: 'number12', title: '12' }, // Number12，tag 55，覆盖 0.7%
  ],

  // 网络电视盒 0x2100（SwitchBot 24 键）
  [IR_TYPE.IPTV]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbPower') }, // Power，tag 1，覆盖 86.6%
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // Mute，tag 3，覆盖 52.9%
    { id: 'up', title: t('pages.ir.remote.up') }, // Up，tag 13，覆盖 61.1%
    { id: 'left', title: t('pages.ir.remote.left') }, // Left，tag 15，覆盖 59.5%
    { id: 'ok', title: t('pages.ir.remote.ok') }, // OK，tag 17，覆盖 74.3%
    { id: 'right', title: t('pages.ir.remote.right') }, // Right，tag 19，覆盖 59.5%
    { id: 'down', title: t('pages.ir.remote.down') }, // Down，tag 21，覆盖 62.6%
    { id: 'volumeUp', title: t('pages.ir.remote.sbVolPlus') }, // VolumeAdd，tag 5，覆盖 61.1%
    { id: 'volumeDown', title: t('pages.ir.remote.sbVolLess') }, // VolumeDelete，tag 7，覆盖 60.9%
    { id: 'channelUp', title: t('pages.ir.remote.channelUp') }, // ChAdd，tag 9，覆盖 53.1%
    { id: 'channelDown', title: t('pages.ir.remote.channelDown') }, // ChRed，tag 11，覆盖 53.0%
    { id: 'play', title: t('pages.ir.remote.sbPlay') }, // Play，tag 23，覆盖 2.8%
    { id: 'menu', title: t('pages.ir.remote.sbHomeText') }, // Menu，tag 12，覆盖 41.6%
    { id: 'back', title: t('pages.ir.remote.sbBack') }, // Back，tag 45，覆盖 52.0%
    { id: 'number1', title: '1' }, // Number1，tag 25，覆盖 57.7%
    { id: 'number2', title: '2' }, // Number2，tag 27，覆盖 57.7%
    { id: 'number3', title: '3' }, // Number3，tag 29，覆盖 57.7%
    { id: 'number4', title: '4' }, // Number4，tag 31，覆盖 56.6%
    { id: 'number5', title: '5' }, // Number5，tag 33，覆盖 54.6%
    { id: 'number6', title: '6' }, // Number6，tag 35，覆盖 52.3%
    { id: 'number7', title: '7' }, // Number7，tag 37，覆盖 51.6%
    { id: 'number8', title: '8' }, // Number8，tag 39，覆盖 51.5%
    { id: 'number9', title: '9' }, // Number9，tag 41，覆盖 51.3%
    { id: 'number0', title: '0' }, // Number0，tag 43，覆盖 49.9%
  ],

  // 数码相机 0x2300（SwitchBot 1 键）
  [IR_TYPE.DC]: (t) => [
    { id: 'shutter', title: t('pages.ir.remote.sbShutter') }, // Shutter，tag 1，覆盖 100.0%
  ],

  // 空气净化器 0x2700（SwitchBot 18 键）
  [IR_TYPE.AP]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbFanPower') }, // Power，tag 1，覆盖 100.0%
    { id: 'mode', title: t('pages.ir.remote.sbLgtMode') }, // Mode，tag 9，覆盖 100.0%
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // Mute，tag 15，覆盖 100.0%
    { id: 'airVolume', title: t('pages.ir.remote.airVolume') }, // AirVol，tag 5，覆盖 100.0%
    { id: 'anion', title: t('pages.ir.remote.sbIon') }, // Anion，tag 11，覆盖 100.0%
    { id: 'autoRun', title: t('pages.ir.remote.sbAuto') }, // AutoMate，tag 3，覆盖 100.0%
    { id: 'closeKey', title: t('pages.ir.remote.closeKey') }, // Close，tag 23，覆盖 100.0%
    { id: 'cozyMode', title: t('pages.ir.remote.sbRhythm') }, // Cozy，tag 13，覆盖 100.0%
    { id: 'strongMode', title: t('pages.ir.remote.strongMode') }, // Force，tag 19，覆盖 100.0%
    { id: 'ledOff', title: t('pages.ir.remote.ledOff') }, // LEDOFF，tag 17，覆盖 100.0%
    { id: 'light1', title: t('pages.ir.remote.light1') }, // Light1，tag 29，覆盖 100.0%
    { id: 'light2', title: t('pages.ir.remote.light2') }, // Light2，tag 31，覆盖 100.0%
    { id: 'light3', title: t('pages.ir.remote.light3') }, // Light3，tag 33，覆盖 100.0%
    { id: 'natureMode', title: t('pages.ir.remote.natureMode') }, // Nature，tag 21，覆盖 100.0%
    { id: 'schedule', title: t('pages.ir.remote.sbSchedule') }, // Schedule，tag 7，覆盖 100.0%
    { id: 'sleepMode', title: t('pages.ir.remote.sbSleep') }, // Sleep，tag 25，覆盖 100.0%
    { id: 'smartMode', title: t('pages.ir.remote.smartMode') }, // smart，tag 27，覆盖 100.0%
    { id: 'uvLamp', title: t('pages.ir.remote.uvLamp') }, // UV，tag 35，覆盖 100.0%
  ],

  // 音响 0x2900（SwitchBot 25 键）
  [IR_TYPE.AUDIO]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbPower') }, // Power，tag 11，覆盖 96.4%
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // Mute，tag 15，覆盖 94.1%
    { id: 'up', title: t('pages.ir.remote.up') }, // Up，tag 3，覆盖 70.1%
    { id: 'left', title: t('pages.ir.remote.left') }, // Left，tag 1，覆盖 68.1%
    { id: 'ok', title: t('pages.ir.remote.ok') }, // OK，tag 5，覆盖 70.4%
    { id: 'right', title: t('pages.ir.remote.right') }, // Right，tag 9，覆盖 68.5%
    { id: 'down', title: t('pages.ir.remote.down') }, // Down，tag 7，覆盖 69.8%
    { id: 'volumeUp', title: t('pages.ir.remote.sbVolPlus') }, // VolumeAdd，tag 13，覆盖 96.9%
    { id: 'volumeDown', title: t('pages.ir.remote.sbVolLess') }, // VolumeDelete，tag 17，覆盖 96.8%
    { id: 'play', title: t('pages.ir.remote.sbPlay') }, // Play，tag 21，覆盖 75.2%
    { id: 'pause', title: t('pages.ir.remote.sbPause') }, // Pause，tag 27，覆盖 74.0%
    { id: 'stop', title: t('pages.ir.remote.sbStop') }, // Stop，tag 6，覆盖 57.2%
    { id: 'fastRewind', title: t('pages.ir.remote.sbRewind') }, // FastReverse，tag 19，覆盖 36.8%
    { id: 'fastForward', title: t('pages.ir.remote.sbForward') }, // FastForward，tag 23，覆盖 29.6%
    { id: 'number1', title: '1' }, // Number1，tag 12，覆盖 49.9%
    { id: 'number2', title: '2' }, // Number2，tag 14，覆盖 49.7%
    { id: 'number3', title: '3' }, // Number3，tag 16，覆盖 49.5%
    { id: 'number4', title: '4' }, // Number4，tag 18，覆盖 48.5%
    { id: 'number5', title: '5' }, // Number5，tag 20，覆盖 48.2%
    { id: 'number6', title: '6' }, // Number6，tag 22，覆盖 47.8%
    { id: 'number7', title: '7' }, // Number7，tag 24，覆盖 47.3%
    { id: 'number8', title: '8' }, // Number8，tag 26，覆盖 47.3%
    { id: 'number9', title: '9' }, // Number9，tag 28，覆盖 46.7%
    { id: 'number0', title: '0' }, // Number0，tag 30，覆盖 46.2%
    { id: 'numberBack', title: t('pages.ir.remote.numberBack') }, // NumberBack，tag 32，覆盖 42.6%
  ],

  // 热水器 0x2F00（SwitchBot 10 键）
  [IR_TYPE.HW]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbFanPower') }, // Power，tag 1，覆盖 100.0%
    { id: 'mode', title: t('pages.ir.remote.sbMode') }, // Mode，tag 9，覆盖 100.0%
    { id: 'keepWarm', title: t('pages.ir.remote.sbWheaterWarm') }, // Stem，tag 19，覆盖 100.0%
    { id: 'heating', title: t('pages.ir.remote.sbWheaterHeat') }, // Heat，tag 11，覆盖 100.0%
    { id: 'schedule', title: t('pages.ir.remote.sbSchedule') }, // Schedule，tag 15，覆盖 100.0%
    { id: 'settings', title: t('pages.ir.remote.settings') }, // Set，tag 3，覆盖 100.0%
    { id: 'tempUp', title: t('pages.ir.remote.sbTempPlus') }, // TempAdd，tag 5，覆盖 100.0%
    { id: 'tempDown', title: t('pages.ir.remote.sbTempLess') }, // TempDelete，tag 7，覆盖 100.0%
    { id: 'timeKey', title: t('pages.ir.remote.timeKey') }, // #17，tag 17，覆盖 100.0%
    { id: 'timerKey', title: t('pages.ir.remote.timerKey') }, // #13，tag 13，覆盖 100.0%
  ],

  // 扫地机 0x3100（SwitchBot 20 键）
  [IR_TYPE.ROBOT]: (t) => [
    { id: 'on', title: t('pages.ir.remote.sbFanOn') }, // On，tag 1，覆盖 100.0%
    { id: 'off', title: t('pages.ir.remote.sbFanOff') }, // Off，tag 3，覆盖 100.0%
    { id: 'mode', title: t('pages.ir.remote.sbMode') }, // mode，tag 17，覆盖 15.8%
    { id: 'up', title: t('pages.ir.remote.up') }, // Up，tag 5，覆盖 100.0%
    { id: 'left', title: t('pages.ir.remote.left') }, // Left，tag 9，覆盖 100.0%
    { id: 'ok', title: t('pages.ir.remote.ok') }, // ok，tag 13，覆盖 57.9%
    { id: 'right', title: t('pages.ir.remote.right') }, // Right，tag 11，覆盖 100.0%
    { id: 'down', title: t('pages.ir.remote.down') }, // Down，tag 7，覆盖 100.0%
    { id: 'home', title: t('pages.ir.remote.home') }, // home，tag 19，覆盖 31.6%
    { id: 'autoRun', title: t('pages.ir.remote.sbAuto') }, // auto，tag 29，覆盖 73.7%
    { id: 'charge', title: t('pages.ir.remote.sbCharge') }, // Charge，tag 15，覆盖 73.7%
    { id: 'cleanKey', title: t('pages.ir.remote.cleanKey') }, // clean，tag 35，覆盖 10.5%
    { id: 'cornerClean', title: t('pages.ir.remote.cornerClean') }, // corner，tag 25，覆盖 100.0%
    { id: 'localClean', title: t('pages.ir.remote.localClean') }, // local，tag 27，覆盖 57.9%
    { id: 'pointClean', title: t('pages.ir.remote.pointClean') }, // point，tag 31，覆盖 42.1%
    { id: 'schedule', title: t('pages.ir.remote.sbSchedule') }, // Schedule，tag 37，覆盖 57.9%
    { id: 'sectionClean', title: t('pages.ir.remote.sectionClean') }, // section，tag 23，覆盖 68.4%
    { id: 'segmentClean', title: t('pages.ir.remote.segmentClean') }, // seg，tag 33，覆盖 26.3%
    { id: 'cleanSpeed', title: t('pages.ir.remote.cleanSpeed') }, // speed，tag 39，覆盖 5.3%
    { id: 'timerKey', title: t('pages.ir.remote.timerKey') }, // time，tag 21，覆盖 68.4%
  ],

  // 机顶盒 0x4000（SwitchBot 24 键）
  [IR_TYPE.STB]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbPower') }, // Power，tag 1，覆盖 96.1%
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // Mute，tag 45，覆盖 81.5%
    { id: 'up', title: t('pages.ir.remote.up') }, // Up，tag 27，覆盖 61.2%
    { id: 'left', title: t('pages.ir.remote.left') }, // Left，tag 29，覆盖 61.5%
    { id: 'ok', title: t('pages.ir.remote.ok') }, // OK，tag 31，覆盖 87.6%
    { id: 'right', title: t('pages.ir.remote.right') }, // Right，tag 33，覆盖 79.5%
    { id: 'down', title: t('pages.ir.remote.down') }, // Down，tag 35，覆盖 61.8%
    { id: 'volumeUp', title: t('pages.ir.remote.sbVolPlus') }, // VolumeAdd，tag 37，覆盖 54.2%
    { id: 'volumeDown', title: t('pages.ir.remote.sbVolLess') }, // VolumeDelete，tag 39，覆盖 82.9%
    { id: 'channelUp', title: t('pages.ir.remote.sbChannelPlus') }, // ChannelAdd，tag 41，覆盖 94.3%
    { id: 'channelDown', title: t('pages.ir.remote.sbChannelLess') }, // ChannelDelete，tag 43，覆盖 94.3%
    { id: 'menu', title: t('pages.ir.remote.sbHome') }, // Menu，tag 12，覆盖 41.9%
    { id: 'back', title: t('pages.ir.remote.sbBack') }, // Back，tag 25，覆盖 94.4%
    { id: 'guide', title: t('pages.ir.remote.guide') }, // Lead，tag 21，覆盖 15.0%
    { id: 'number1', title: '1' }, // Number1，tag 3，覆盖 53.1%
    { id: 'number2', title: '2' }, // Number2，tag 5，覆盖 53.1%
    { id: 'number3', title: '3' }, // Number3，tag 7，覆盖 53.1%
    { id: 'number4', title: '4' }, // Number4，tag 9，覆盖 53.1%
    { id: 'number5', title: '5' }, // Number5，tag 11，覆盖 53.1%
    { id: 'number6', title: '6' }, // Number6，tag 13，覆盖 53.0%
    { id: 'number7', title: '7' }, // Number7，tag 15，覆盖 52.9%
    { id: 'number8', title: '8' }, // Number8，tag 17，覆盖 52.8%
    { id: 'number9', title: '9' }, // Number9，tag 19，覆盖 52.8%
    { id: 'number0', title: '0' }, // Number0，tag 23，覆盖 52.7%
  ],

  // 影碟机 0x6000（SwitchBot 31 键）
  [IR_TYPE.DVD]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbPower') }, // Power，tag 11，覆盖 77.3%
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // Mute，tag 1,13，覆盖 44.1%
    { id: 'up', title: t('pages.ir.remote.up') }, // Up，tag 10,3，覆盖 94.9%
    { id: 'left', title: t('pages.ir.remote.left') }, // Left，tag 12，覆盖 69.9%
    { id: 'ok', title: t('pages.ir.remote.ok') }, // OK/Ok，tag 18,5，覆盖 83.1%
    { id: 'right', title: t('pages.ir.remote.right') }, // Right，tag 16,9，覆盖 74.7%
    { id: 'down', title: t('pages.ir.remote.down') }, // Down，tag 14,7，覆盖 94.8%
    { id: 'volumeUp', title: t('pages.ir.remote.sbVolPlus') }, // VolumeAdd，tag 8，覆盖 25.8%
    { id: 'volumeDown', title: t('pages.ir.remote.sbVolLess') }, // VolumeDelete，tag 6，覆盖 46.5%
    { id: 'play', title: t('pages.ir.remote.sbPlay') }, // Play，tag 17，覆盖 77.8%
    { id: 'pause', title: t('pages.ir.remote.sbPause') }, // Pause，tag 29，覆盖 76.1%
    { id: 'stop', title: t('pages.ir.remote.sbStop') }, // Stop，tag 4,23，覆盖 74.8%
    { id: 'fastRewind', title: t('pages.ir.remote.sbRewind') }, // FastReverse，tag 15，覆盖 27.7%
    { id: 'fastForward', title: t('pages.ir.remote.sbForward') }, // FastForward，tag 19，覆盖 74.0%
    { id: 'previous', title: t('pages.ir.remote.sbLast') }, // Last，tag 21，覆盖 3.2%
    { id: 'next', title: t('pages.ir.remote.sbNext') }, // Next，tag 25，覆盖 3.2%
    { id: 'menu', title: t('pages.ir.remote.sbMenuHome') }, // Menu，tag 2,35，覆盖 72.2%
    { id: 'back', title: t('pages.ir.remote.sbBack') }, // Back，tag 20,37，覆盖 93.8%
    { id: 'format', title: t('pages.ir.remote.format') }, // Format，tag 27，覆盖 3.1%
    { id: 'eject', title: t('pages.ir.remote.sbEject') }, // TakeOut，tag 33，覆盖 3.2%
    { id: 'titleKey', title: t('pages.ir.remote.titleKey') }, // Title，tag 31，覆盖 3.1%
    { id: 'number1', title: '1' }, // Number1，tag 26，覆盖 69.1%
    { id: 'number2', title: '2' }, // Number2，tag 28，覆盖 69.1%
    { id: 'number3', title: '3' }, // Number3，tag 30，覆盖 69.1%
    { id: 'number4', title: '4' }, // Number4，tag 32，覆盖 69.1%
    { id: 'number5', title: '5' }, // Number5，tag 34，覆盖 69.1%
    { id: 'number6', title: '6' }, // Number6，tag 36，覆盖 69.0%
    { id: 'number7', title: '7' }, // Number7，tag 38，覆盖 69.0%
    { id: 'number8', title: '8' }, // Number8，tag 40，覆盖 69.0%
    { id: 'number9', title: '9' }, // Number9，tag 42，覆盖 68.9%
    { id: 'number0', title: '0' }, // Number0，tag 44，覆盖 68.6%
  ],

  // 风扇 0x8000（SwitchBot 22 键）
  [IR_TYPE.FANS]: (t) => [
    { id: 'power', title: t('pages.ir.remote.power') }, // Power，tag 1，覆盖 100.0%
    { id: 'fanSpeed', title: t('pages.ir.remote.fanSpeed') }, // On_speed，tag 3，覆盖 98.9%
    { id: 'headShake', title: t('pages.ir.remote.headShake') }, // Swing，tag 5，覆盖 100.0%
    { id: 'mode', title: t('pages.ir.remote.mode') }, // Mode，tag 7,30000，覆盖 100.0%
    { id: 'timerKey', title: t('pages.ir.remote.sbLgtTimer') }, // Schedule，tag 9，覆盖 100.0%
    { id: 'lightKey', title: t('pages.ir.remote.lightKey') }, // Light，tag 11，覆盖 98.9%
    { id: 'anion', title: t('pages.ir.remote.sbIon') }, // Anion，tag 13，覆盖 98.9%
    { id: 'sleepMode', title: t('pages.ir.remote.sleepMode') }, // Sleep，tag 33，覆盖 98.9%
    { id: 'coolKey', title: t('pages.ir.remote.coolKey') }, // Cold，tag 35，覆盖 98.9%
    { id: 'airVolume', title: t('pages.ir.remote.airVolume') }, // AirVol，tag 37，覆盖 98.9%
    { id: 'lowSpeed', title: t('pages.ir.remote.lowSpeed') }, // Wind1，tag 39，覆盖 98.9%
    { id: 'mediumSpeed', title: t('pages.ir.remote.mediumSpeed') }, // Wind2，tag 41，覆盖 98.9%
    { id: 'highSpeed', title: t('pages.ir.remote.highSpeed') }, // Wind3，tag 43，覆盖 98.9%
    { id: 'number1', title: '1' }, // S1，tag 15，覆盖 98.9%
    { id: 'number2', title: '2' }, // S2，tag 17，覆盖 98.9%
    { id: 'number3', title: '3' }, // S3，tag 19，覆盖 98.9%
    { id: 'number4', title: '4' }, // S4，tag 21，覆盖 98.9%
    { id: 'number5', title: '5' }, // S5，tag 23，覆盖 98.9%
    { id: 'number6', title: '6' }, // S6，tag 25，覆盖 98.9%
    { id: 'number7', title: '7' }, // S7，tag 27，覆盖 98.9%
    { id: 'number8', title: '8' }, // S8，tag 29，覆盖 98.9%
    { id: 'number9', title: '9' }, // S9，tag 31，覆盖 98.9%
  ],

  // 投影仪 0xA000（SwitchBot 25 键）
  [IR_TYPE.PJT]: (t) => [
    { id: 'power', title: t('pages.ir.remote.sbPower') }, // Power，tag 2，覆盖 89.9%
    { id: 'on', title: t('pages.ir.remote.sbFanOn') }, // On，tag 1，覆盖 3.7%
    { id: 'off', title: t('pages.ir.remote.sbFanOff') }, // Off，tag 3，覆盖 3.7%
    { id: 'mute', title: t('pages.ir.remote.sbMute') }, // Mute，tag 37，覆盖 63.0%
    { id: 'up', title: t('pages.ir.remote.up') }, // Up，tag 23，覆盖 92.2%
    { id: 'left', title: t('pages.ir.remote.left') }, // Left，tag 25，覆盖 90.7%
    { id: 'ok', title: t('pages.ir.remote.ok') }, // OK/Confirm，tag 6,21，覆盖 90.4%
    { id: 'right', title: t('pages.ir.remote.right') }, // Right，tag 27，覆盖 90.9%
    { id: 'down', title: t('pages.ir.remote.down') }, // Down，tag 29，覆盖 91.8%
    { id: 'volumeUp', title: t('pages.ir.remote.sbVolPlus') }, // VolumeAdd，tag 33，覆盖 69.7%
    { id: 'volumeDown', title: t('pages.ir.remote.sbVolLess') }, // VolumeDelete，tag 35，覆盖 68.6%
    { id: 'play', title: t('pages.ir.remote.sbPlay') }, // Play，tag 10，覆盖 75.8%
    { id: 'pause', title: t('pages.ir.remote.sbPause') }, // Pause，tag 41，覆盖 73.6%
    { id: 'menu', title: t('pages.ir.remote.sbHome') }, // Menu，tag 4,19，覆盖 87.3%
    { id: 'back', title: t('pages.ir.remote.sbRemoteReturn') }, // Back，tag 12，覆盖 56.9%
    { id: 'quit', title: t('pages.ir.remote.quit') }, // Quit，tag 31，覆盖 2.9%
    { id: 'autoAdjust', title: t('pages.ir.remote.autoAdjust') }, // Auto，tag 39，覆盖 3.4%
    { id: 'computerSource', title: t('pages.ir.remote.computerSource') }, // Computer，tag 5，覆盖 3.4%
    { id: 'focusUp', title: t('pages.ir.remote.focusUp') }, // FocusAdd，tag 11，覆盖 3.5%
    { id: 'focusDown', title: t('pages.ir.remote.focusDown') }, // FocusRed，tag 13，覆盖 3.5%
    { id: 'mcd', title: t('pages.ir.remote.mcd') }, // MCD，tag 43，覆盖 2.3%
    { id: 'screenUp', title: t('pages.ir.remote.sbZoomIn') }, // ScreenAdd，tag 15，覆盖 2.4%
    { id: 'screenDown', title: t('pages.ir.remote.sbZoomOut') }, // ScreenDelete，tag 17，覆盖 2.4%
    { id: 'signalSource', title: t('pages.ir.remote.signalSource') }, // SignalSource，tag 9，覆盖 3.7%
    { id: 'videoSource', title: t('pages.ir.remote.videoSource') }, // Video，tag 7，覆盖 3.5%
  ],

  // 灯 0xE000（SwitchBot 13 键）
  [IR_TYPE.LIGHT]: (t) => [
    { id: 'openLight', title: t('pages.ir.remote.openLight') }, // On，tag 1，覆盖 83.7%
    { id: 'closeLight', title: t('pages.ir.remote.closeLight') }, // Off，tag 3，覆盖 89.2%
    { id: 'power', title: t('pages.ir.remote.power') }, // ON/OFF，tag 10120，覆盖 1.2%
    { id: 'brightnessUp', title: t('pages.ir.remote.brightnessUp') }, // BrightnessPlus，tag 5，覆盖 85.7%
    { id: 'brightnessDown', title: t('pages.ir.remote.brightnessDown') }, // BrightnessLess，tag 7，覆盖 85.7%
    { id: 'colorTempUp', title: t('pages.ir.remote.colorTempUp') }, // TempPlus，tag 17，覆盖 7.8%
    { id: 'colorTempDown', title: t('pages.ir.remote.colorTempDown') }, // TempLess，tag 19，覆盖 7.8%
    { id: 'mode', title: t('pages.ir.remote.mode') }, // Mode，tag 9，覆盖 0.6%
    { id: 'settings', title: t('pages.ir.remote.sbRemoteSetting') }, // Setting，tag 11，覆盖 1.5%
    { id: 'timerKey', title: t('pages.ir.remote.sbLgtTimer') }, // オフタイマー，tag 10303，覆盖 9.4%
    { id: 'min30', title: t('pages.ir.remote.sbLgt30min') }, // 30 分後に消灯する，tag 10304，覆盖 36.3%
    { id: 'nightLight', title: t('pages.ir.remote.sbLgtNight') }, // 常夜灯/NightLight，tag 10300,10002,8，覆盖 87.2%
    { id: 'allLight', title: t('pages.ir.remote.sbLgtAll') }, // 全灯/AllLight，tag 10001,10，覆盖 11.5%
  ],
};
