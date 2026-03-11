import ariIcon from './png_air.png';
import fanIcon from './png_fan.png';
import learnIcon from './png_learn.png';
import lightIcon from './png_light.png';
import tvIcon from './png_tv.png';

// 空调遥控器图片导入
import airModelAuto from './png_air_model_auto_01.png';
import airModelCold from './png_air_model_cold_02.png';
import airModelDry from './png_air_model_dry_03.png';
import airModelHot from './png_air_model_hot_05.png';
import airModelWind from './png_air_model_wind_04.png';
import airTempAdd from './png_air_temperature_add.png';
import airTempReduce from './png_air_temperature_reduce.png';
import airWindHorizontalAuto from './png_air_wind_horizontal_auto.png';
import airWindHorizontalStop from './png_air_wind_horizontal_stop.png';
import airWindSpeedAuto from './png_air_wind_speed_auto.png';
import airWindSpeedV1 from './png_air_wind_speed_v1.png';
import airWindSpeedV2 from './png_air_wind_speed_v2.png';
import airWindSpeedV3 from './png_air_wind_speed_v3.png';
import airWindVerticalV1 from './png_air_wind_vertical_v1.png';
import airWindVerticalV2 from './png_air_wind_vertical_v2.png';
import airWindVerticalV3 from './png_air_wind_vertical_v3.png';
import powerOff from './png_power_off.png';
import powerOn from './png_power_on.png';
import irMatch from './png_ir_match.png';

import React from 'react';

export const SvgAir = ({ opacity = 1 }) => {
  return <img src={ariIcon} alt="air icon" style={{ opacity: opacity, width: '32px', height: '32px' }} />;
};

export const SvgFan = ({ opacity = 1 }) => {
  return <img src={fanIcon} alt="fan icon" style={{ opacity: opacity, width: '32px', height: '32px' }} />;
};
export const SvgLearn = ({ opacity = 1 }) => {
  return <img src={learnIcon} alt="learn icon" style={{ opacity: opacity, width: '40px', height: '40px' }} />;
};
export const SvgLight = ({ opacity = 1 }) => {
  return <img src={lightIcon} alt="light icon" style={{ opacity: opacity, width: '32px', height: '32px' }} />;
};
export const SvgTV = ({ opacity = 1 }) => {
  return <img src={tvIcon} alt="tv icon" style={{ opacity: opacity, width: '34px', height: '34px' }} />;
};

// 空调遥控器组件
export const AirModelAuto = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airModelAuto} alt="auto mode icon" style={{ opacity, width, height }} />;
};

export const AirModelCold = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airModelCold} alt="cold mode icon" style={{ opacity, width, height }} />;
};

export const AirModelDry = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airModelDry} alt="dry mode icon" style={{ opacity, width, height }} />;
};

export const AirModelHot = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airModelHot} alt="hot mode icon" style={{ opacity, width, height }} />;
};

export const AirModelWind = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airModelWind} alt="wind mode icon" style={{ opacity, width, height }} />;
};

export const AirTempAdd = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airTempAdd} alt="temperature add icon" style={{ opacity, width, height }} />;
};

export const AirTempReduce = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airTempReduce} alt="temperature reduce icon" style={{ opacity, width, height }} />;
};

export const AirWindHorizontalAuto = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airWindHorizontalAuto} alt="horizontal auto wind icon" style={{ opacity, width, height }} />;
};

export const AirWindHorizontalStop = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airWindHorizontalStop} alt="horizontal stop wind icon" style={{ opacity, width, height }} />;
};

export const AirWindSpeedAuto = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airWindSpeedAuto} alt="auto wind speed icon" style={{ opacity, width, height }} />;
};

export const AirWindSpeedV1 = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airWindSpeedV1} alt="wind speed level 1 icon" style={{ opacity, width, height }} />;
};

export const AirWindSpeedV2 = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airWindSpeedV2} alt="wind speed level 2 icon" style={{ opacity, width, height }} />;
};

export const AirWindSpeedV3 = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airWindSpeedV3} alt="wind speed level 3 icon" style={{ opacity, width, height }} />;
};

export const AirWindVerticalV1 = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airWindVerticalV1} alt="vertical wind level 1 icon" style={{ opacity, width, height }} />;
};

export const AirWindVerticalV2 = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airWindVerticalV2} alt="vertical wind level 2 icon" style={{ opacity, width, height }} />;
};

export const AirWindVerticalV3 = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={airWindVerticalV3} alt="vertical wind level 3 icon" style={{ opacity, width, height }} />;
};

export const PowerOff = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={powerOff} alt="power off icon" style={{ opacity, width, height }} />;
};

export const PowerOn = ({ opacity = 1, width = '140px', height = '36px' }) => {
  return <img src={powerOn} alt="power on icon" style={{ opacity, width, height }} />;
};

export const IRMatch = ({ opacity = 1, width = '100px', height = '128px' }) => {
  return <img src={irMatch} alt="IR match icon" style={{ opacity, width, height }} />;
};
