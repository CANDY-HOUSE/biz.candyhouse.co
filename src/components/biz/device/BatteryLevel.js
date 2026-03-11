import React from 'react';
import { Box, Typography } from '@mui/material';
import Battery0BarIcon from '@mui/icons-material/Battery0Bar';
import Battery1BarIcon from '@mui/icons-material/Battery1Bar';
import Battery2BarIcon from '@mui/icons-material/Battery2Bar';
import Battery3BarIcon from '@mui/icons-material/Battery3Bar';
import Battery4BarIcon from '@mui/icons-material/Battery4Bar';
import Battery5BarIcon from '@mui/icons-material/Battery5Bar';
import Battery6BarIcon from '@mui/icons-material/Battery6Bar';
import BatteryFull from '@mui/icons-material/BatteryFull';

export const BatteryLevel = ({ opacity = 1, level }) => {
  if (typeof level !== 'number') {
    return <></>;
  }

  const batteryLevel = Math.max(0, Math.min(100, Number(level)));
  const batteryColor = batteryLevel < 15 ? 'error.main' : batteryLevel < 30 ? '#f3dd71' : 'primary.main';

  let BatteryIcon;
  if (batteryLevel === 0) {
    BatteryIcon = Battery0BarIcon;
  } else if (batteryLevel === 100) {
    BatteryIcon = BatteryFull;
  } else if (batteryLevel <= 16) {
    BatteryIcon = Battery1BarIcon;
  } else if (batteryLevel <= 33) {
    BatteryIcon = Battery2BarIcon;
  } else if (batteryLevel <= 50) {
    BatteryIcon = Battery3BarIcon;
  } else if (batteryLevel <= 66) {
    BatteryIcon = Battery4BarIcon;
  } else if (batteryLevel <= 83) {
    BatteryIcon = Battery5BarIcon;
  } else {
    BatteryIcon = Battery6BarIcon;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <BatteryIcon sx={{ opacity, color: batteryColor, fontSize: '26px', transform: 'rotate(90deg)' }} />
      <Typography
        variant="h5"
        sx={{
          ml: '5px',
          color: 'info.light',
        }}
      >
        {`${batteryLevel}%`}
      </Typography>
    </Box>
  );
};
