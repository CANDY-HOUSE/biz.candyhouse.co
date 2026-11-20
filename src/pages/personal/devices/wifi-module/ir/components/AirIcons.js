import React from 'react';
import { createSvgIcon } from '@mui/material/utils';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import SouthEastRoundedIcon from '@mui/icons-material/SouthEastRounded';

export const FanIcon = createSvgIcon(
  <g>
    <ellipse cx="12" cy="6.4" rx="2.8" ry="4.4" />
    <ellipse cx="12" cy="6.4" rx="2.8" ry="4.4" transform="rotate(120 12 12)" />
    <ellipse cx="12" cy="6.4" rx="2.8" ry="4.4" transform="rotate(240 12 12)" />
    <circle cx="12" cy="12" r="2" />
  </g>,
  'AirFan'
);

// 下标与空调页 currentState.windDirection 一致：0 向上、1 居中、2 向下
const WIND_DIRECTION_ICONS = [NorthEastRoundedIcon, EastRoundedIcon, SouthEastRoundedIcon];

export const getWindDirectionIcon = (windDirection) => WIND_DIRECTION_ICONS[windDirection] || EastRoundedIcon;
