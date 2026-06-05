import lock from './lock.png';
import unlock from './unlock.png';
import disablelock from './disablelock.png';
import botLock from './swtich_locked.png';
import botUnLock from './swtich_unlocked.png';
import botNoSign from './swtich_no_ble.png';
import batteryIcon from './icn-battery.png';
import opensensorBgIcon from './opensensor-bg.png';
import arrow from './arrow.svg';
import { Box } from '@mui/material';

import React from 'react';

export const PngBotIcon = ({ state }) => {
  switch (state) {
    case -1:
      return <img src={botNoSign} alt="No signal icon" style={{ opacity: 1, width: '51px', height: '51px' }} />;
    case 0:
      return <img src={botUnLock} alt="Unlocked icon" style={{ opacity: 1, width: '51px', height: '51px' }} />;
    case 1:
      return <img src={botLock} alt="Locked icon" style={{ opacity: 1, width: '51px', height: '51px' }} />;
    default:
      return <img src={lock} alt="Lock icon" style={{ opacity: 1 }} />;
  }
};

export const SvgLock = ({ opacity = 1 }) => {
  return <img src={lock} alt="Lock Icon" style={{ opacity: opacity, width: '51px', height: '51px' }} />;
};

export const SvgLockDisable = ({ opacity = 1 }) => {
  return <img src={disablelock} alt="Disabled lock icon" style={{ opacity: opacity, width: '51px', height: '51px' }} />;
};

export const SvgUnLock = ({ opacity = 1 }) => {
  return <img src={unlock} alt="Unlock icon" style={{ opacity: opacity, width: '51px', height: '51px' }} />;
};

export const SvgBattery = ({ opacity = 1 }) => {
  return <img src={batteryIcon} alt="battery icon" style={{ opacity: opacity, width: '25px', height: '18px' }} />;
};

export const SvgOPS = ({ opacity = 1, label }) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', width: 51, height: 51 }}>
      <img src={opensensorBgIcon} alt="ops icon" style={{ opacity, width: 51, height: 51 }} />
      {label != null && label !== '' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#e4e3e3',
            pointerEvents: 'none',
          }}
        >
          {label}
        </Box>
      )}
    </Box>
  );
};

export const SvgArrow = ({ opacity = 1 }) => {
  return <img src={arrow} alt="arrow icon" style={{ opacity: opacity, width: '20px', height: '20px' }} />;
};
