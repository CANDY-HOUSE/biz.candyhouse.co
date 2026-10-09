/**
 * 非空调按键 → 下发键号（写进 16 字节指令的第 [9] 字节）。
 * 由 ir_workspace/code/pipeline/ir_keys/gen_ir_keys.py 从 key_spec.py 生成，勿手改。
 *
 * 键号 1..N = HXD 码表列号（HXD 遥控器按列取码）；64 起 = SwitchBot 独有键。
 * 后端 parse_ir_data_send_hub3 用同一份映射找码：code < 30000 查 ir_tables，
 * code >= 30000 查 ir_sb_wave_non_air。
 */
export const NON_AIR_KEY_IDS = {
  // 0x2000 tv（HXD 26 键）
  0x2000: {
    volumeDown: 1,
    channelUp: 2,
    menu: 3,
    channelDown: 4,
    volumeUp: 5,
    power: 6,
    mute: 7,
    number1: 8,
    number2: 9,
    number3: 10,
    number4: 11,
    number5: 12,
    number6: 13,
    number7: 14,
    number8: 15,
    number9: 16,
    selectKey: 17,
    number0: 18,
    avTv: 19,
    back: 20,
    ok: 21,
    up: 22,
    left: 23,
    right: 24,
    down: 25,
    home: 26,
    signalSource: 64,
    play: 65,
    pause: 66,
    stop: 67,
    fastRewind: 68,
    fastForward: 69,
    previous: 70,
    next: 71,
    record: 72,
    eject: 73,
    listKey: 74,
    programList: 75,
    favorite: 76,
    dataKey: 77,
    subtitle: 78,
    audioTrack: 79,
    displayKey: 80,
    internet: 81,
    bs: 82,
    cs: 83,
    dttv: 84,
    colorRed: 85,
    colorGreen: 86,
    colorYellow: 87,
    colorBlue: 88,
    number10: 89,
    number11: 90,
    number12: 91,
  },
  // 0x8000 fan（HXD 22 键）
  0x8000: {
    power: 1,
    fanSpeed: 2,
    headShake: 3,
    mode: 4,
    timerKey: 5,
    lightKey: 6,
    anion: 7,
    number1: 8,
    number2: 9,
    number3: 10,
    number4: 11,
    number5: 12,
    number6: 13,
    number7: 14,
    number8: 15,
    number9: 16,
    sleepMode: 17,
    coolKey: 18,
    airVolume: 19,
    lowSpeed: 20,
    wind1: 20,
    mediumSpeed: 21,
    wind2: 21,
    highSpeed: 22,
    wind3: 22,
    on: 64,
    off: 65,
    mute: 66,
  },
  // 0xE000 light（HXD 20 键）
  0xe000: {
    openLight: 1,
    closeLight: 2,
    brightnessUp: 3,
    brightnessDown: 4,
    mode: 5,
    settings: 6,
    timeUp: 7,
    timeDown: 8,
    colorTempUp: 9,
    colorTempDown: 10,
    scene1: 11,
    scene2: 12,
    scene3: 13,
    scene4: 14,
    scene5: 15,
    scene6: 16,
    sceneA: 17,
    sceneB: 18,
    sceneC: 19,
    sceneD: 20,
    power: 64,
    timerKey: 65,
    min30: 66,
    nightLight: 67,
    allLight: 68,
  },
  // 0x2100 iptv（HXD 25 键）
  0x2100: {
    power: 1,
    mute: 2,
    volumeUp: 3,
    volumeDown: 4,
    channelUp: 5,
    channelDown: 6,
    up: 7,
    left: 8,
    ok: 9,
    right: 10,
    down: 11,
    play: 12,
    number1: 13,
    number2: 14,
    number3: 15,
    number4: 16,
    number5: 17,
    number6: 18,
    number7: 19,
    number8: 20,
    number9: 21,
    number0: 22,
    back: 23,
    home: 24,
    menu: 25,
    on: 64,
    off: 65,
    tvPower: 66,
    tvOn: 67,
    tvOff: 68,
    listKey: 69,
    numberBack: 70,
  },
  // 0x4000 stb（HXD 23 键）
  0x4000: {
    power: 1,
    number1: 2,
    number2: 3,
    number3: 4,
    number4: 5,
    number5: 6,
    number6: 7,
    number7: 8,
    number8: 9,
    number9: 10,
    guide: 11,
    number0: 12,
    back: 13,
    up: 14,
    left: 15,
    ok: 16,
    right: 17,
    down: 18,
    volumeUp: 19,
    volumeDown: 20,
    channelUp: 21,
    channelDown: 22,
    menu: 23,
    mute: 64,
    on: 65,
    off: 66,
    tvPower: 67,
    tvOn: 68,
    tvOff: 69,
    listKey: 70,
    favorite: 71,
    numberBack: 72,
  },
  // 0x6000 dvd（HXD 19 键）
  0x6000: {
    left: 1,
    up: 2,
    ok: 3,
    down: 4,
    right: 5,
    power: 6,
    mute: 7,
    fastRewind: 8,
    play: 9,
    fastForward: 10,
    previous: 11,
    stop: 12,
    next: 13,
    format: 14,
    pause: 15,
    titleKey: 16,
    eject: 17,
    menu: 18,
    back: 19,
    volumeUp: 64,
    volumeDown: 65,
    number1: 66,
    number2: 67,
    number3: 68,
    number4: 69,
    number5: 70,
    number6: 71,
    number7: 72,
    number8: 73,
    number9: 74,
    number0: 75,
    listKey: 76,
    numberBack: 77,
  },
  // 0xA000 pjt（HXD 22 键）
  0xa000: {
    on: 1,
    off: 2,
    computerSource: 3,
    videoSource: 4,
    signalSource: 5,
    focusUp: 6,
    focusDown: 7,
    screenUp: 8,
    screenDown: 9,
    menu: 10,
    ok: 11,
    up: 12,
    left: 13,
    right: 14,
    down: 15,
    quit: 16,
    volumeUp: 17,
    volumeDown: 18,
    mute: 19,
    autoAdjust: 20,
    pause: 21,
    mcd: 22,
    power: 64,
    play: 65,
    back: 66,
    listKey: 67,
    screenKey: 68,
  },
  // 0x2300 camera（HXD 1 键）
  0x2300: {
    shutter: 1,
    menu: 64,
    timerKey: 65,
  },
  // 0x2700 airpur（HXD 18 键）
  0x2700: {
    power: 1,
    autoRun: 2,
    airVolume: 3,
    schedule: 4,
    mode: 5,
    anion: 6,
    cozyMode: 7,
    mute: 8,
    ledOff: 9,
    strongMode: 10,
    natureMode: 11,
    closeKey: 12,
    sleepMode: 13,
    smartMode: 14,
    light1: 15,
    light2: 16,
    light3: 17,
    uvLamp: 18,
    on: 64,
    off: 65,
    wind1: 66,
    wind2: 67,
    wind3: 68,
    childLock: 69,
    timerKey: 70,
  },
  // 0x2900 audio（HXD 18 键）
  0x2900: {
    left: 1,
    up: 2,
    ok: 3,
    down: 4,
    right: 5,
    power: 6,
    volumeUp: 7,
    mute: 8,
    volumeDown: 9,
    fastRewind: 10,
    play: 11,
    fastForward: 12,
    previous: 13,
    stop: 14,
    next: 15,
    pause: 16,
    menu: 17,
    back: 18,
    on: 64,
    off: 65,
    number1: 66,
    number2: 67,
    number3: 68,
    number4: 69,
    number5: 70,
    number6: 71,
    number7: 72,
    number8: 73,
    number9: 74,
    number0: 75,
    numberBack: 76,
  },
  // 0x2F00 water（HXD 10 键）
  0x2f00: {
    power: 1,
    settings: 2,
    tempUp: 3,
    tempDown: 4,
    mode: 5,
    heating: 6,
    timerKey: 7,
    schedule: 8,
    timeKey: 9,
    keepWarm: 10,
    steam: 10,
    on: 64,
    off: 65,
  },
  // 0x3100 sweeper（HXD 21 键）
  0x3100: {
    on: 1,
    off: 2,
    up: 3,
    down: 4,
    left: 5,
    right: 6,
    ok: 7,
    charge: 8,
    mode: 9,
    home: 10,
    timerKey: 11,
    sectionClean: 12,
    cornerClean: 13,
    localClean: 14,
    autoRun: 15,
    pointClean: 16,
    segmentClean: 17,
    cleanKey: 18,
    schedule: 19,
    cleanSpeed: 20,
    settings: 21,
  },
};

/** 取某品类某按键的下发键号；找不到返回 null（调用方应提示「该按键不支持」而不是乱发）。 */
export const getNonAirKeyId = (irType, configId) => {
  const table = NON_AIR_KEY_IDS[parseInt(irType, 10)];
  const id = table ? table[configId] : undefined;
  return id === undefined ? null : id;
};

/** 各品类 HXD 码表的键数 N：HXD 遥控器（code < 30000）只有键号 1..N 可用。 */
export const NON_AIR_HXD_KEY_COUNT = {
  0x2000: 26, // tv
  0x8000: 22, // fan
  0xe000: 20, // light
  0x2100: 25, // iptv
  0x4000: 23, // stb
  0x6000: 19, // dvd
  0xa000: 22, // pjt
  0x2300: 1, // camera
  0x2700: 18, // airpur
  0x2900: 18, // audio
  0x2f00: 10, // water
  0x3100: 21, // sweeper
};

/** SwitchBot 数据里存在的键号：SwitchBot 遥控器（code >= 30000）只有这些键可能有码。 */
export const NON_AIR_SB_KEYS = {
  0x2000: [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 64, 65, 66, 67, 68,
    69, 72, 75, 77, 78, 79, 80, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91,
  ], // tv
  0x8000: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], // fan
  0xe000: [1, 2, 3, 4, 5, 6, 9, 10, 64, 65, 66, 67, 68], // light
  0x2100: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25], // iptv
  0x4000: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 64], // stb
  0x6000: [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
  ], // dvd
  0xa000: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 64, 65, 66], // pjt
  0x2300: [1], // camera
  0x2700: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], // airpur
  0x2900: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76], // audio
  0x2f00: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // water
  0x3100: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // sweeper
};

/**
 * 这台遥控器理论上有没有这个键（按码源判断：HXD 看列号，SwitchBot 看数据里有无）。
 * true 也不保证一定有码 —— 具体某台遥控器缺某个键时后端会返回 406。
 */
export const isNonAirKeyAvailable = (irType, code, keyId) => {
  const t = parseInt(irType, 10);
  if (keyId === null || keyId === undefined) return false;
  if (parseInt(code, 10) >= 30000) return (NON_AIR_SB_KEYS[t] || []).includes(keyId);
  return keyId >= 1 && keyId <= (NON_AIR_HXD_KEY_COUNT[t] || 0);
};

// 开/关机键号：按码源分别挑覆盖率最高的（由生成器统计实际数据得出）。
// 例：投影仪 HXD 只有开机/关机两列；SwitchBot 的单一电源键覆盖 90%，开机键只有 4%。
// 供 Matter 桥接等只需要「开」「关」两个动作的场景使用。
const POWER_KEYS = {
  0x2000: { hxd: [6, 6], sb: [6, 6] }, // tv
  0x8000: { hxd: [1, 1], sb: [1, 1] }, // fan
  0xe000: { hxd: [1, 2], sb: [1, 2] }, // light
  0x2100: { hxd: [1, 1], sb: [1, 1] }, // iptv
  0x4000: { hxd: [1, 1], sb: [1, 1] }, // stb
  0x6000: { hxd: [6, 6], sb: [6, 6] }, // dvd
  0xa000: { hxd: [1, 2], sb: [64, 64] }, // pjt
  0x2300: { hxd: [1, 1], sb: [1, 1] }, // camera
  0x2700: { hxd: [1, 1], sb: [1, 1] }, // airpur
  0x2900: { hxd: [6, 6], sb: [6, 6] }, // audio
  0x2f00: { hxd: [1, 1], sb: [1, 1] }, // water
  0x3100: { hxd: [1, 2], sb: [1, 2] }, // sweeper
};
const powerKeys = (irType, code) => {
  const p = POWER_KEYS[parseInt(irType, 10)];
  if (!p) return [null, null];
  return parseInt(code, 10) >= 30000 ? p.sb : p.hxd;
};
export const getNonAirPowerOnKeyId = (irType, code) => powerKeys(irType, code)[0];
export const getNonAirPowerOffKeyId = (irType, code) => powerKeys(irType, code)[1];
