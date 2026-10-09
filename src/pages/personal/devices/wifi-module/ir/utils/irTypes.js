/**
 * 红外遥控设备类型 irType，取值与固件/后台一致（DEVICE_REMOTE_*）。
 * 数据文件里的英文代号（tv / stb / …）对照见 ir_workspace/data/03-index/README.md。
 */
export const IR_TYPE = {
  TV: 0x2000, // 电视 tv
  IPTV: 0x2100, // 网络电视盒 iptv
  DC: 0x2300, // 数码相机 camera
  AP: 0x2700, // 空气净化器 airpur
  AUDIO: 0x2900, // 音响 audio
  HW: 0x2f00, // 热水器 water
  ROBOT: 0x3100, // 扫地机 sweeper
  STB: 0x4000, // 机顶盒 stb
  DVD: 0x6000, // 影碟机 dvd
  FANS: 0x8000, // 风扇 fan
  PJT: 0xa000, // 投影仪 pjt
  AIR: 0xc000, // 空调 air（走 remote-air 页面）
  LIGHT: 0xe000, // 灯 light
};
