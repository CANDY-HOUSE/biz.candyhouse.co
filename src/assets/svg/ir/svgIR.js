import ariIcon from './png_air.png';
import fanIcon from './png_fan.png';
import learnIcon from './png_learn.png';
import lightIcon from './png_light.png';
import tvIcon from './png_tv.png';

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
