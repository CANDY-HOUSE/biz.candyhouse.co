import { IconButton } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import Hider from '@/components/biz/Hider';
import { PngBotIcon, SvgLock, SvgLockDisable, SvgOPS, SvgUnLock } from '@/assets/svg/svgLock';
import { gUtils } from '@/utils/gUtils';

const VIotSwitch = ({ gIot, deviceUUID, shareKey, model = 'ssm_touch_pro', defaultState = undefined }) => {
  const [checked, setChecked] = useState(undefined);
  const [isShow, setIsShow] = useState(true);

  useEffect(() => {
    if (deviceUUID) {
      if (deviceUUID.includes('----') || deviceUUID === '') {
        setIsShow(false);
      }
    }
  }, [model]);

  useEffect(() => {
    setChecked(defaultState ? defaultState === 'unlocked' : undefined);
  }, [defaultState]);

  const handleChange = (e) => {
    e.stopPropagation();
    gIot.sendCommandToWM2({ device_id: deviceUUID, sescretKey: shareKey });
  };

  const stateView = useMemo(() => {
    if (gUtils.isBotModel(model)) {
      return (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            gIot.sendCommandToWM2({ device_id: deviceUUID, sescretKey: shareKey, cmd: 89 });
          }}
        >
          {checked === undefined ? <PngBotIcon state={-1} /> : <PngBotIcon state={0} />}
        </IconButton>
      );
    }
    if (gUtils.isLockModel(model)) {
      return (
        <IconButton onClick={handleChange}>
          {checked === undefined ? <SvgLockDisable /> : checked ? <SvgUnLock /> : <SvgLock />}
        </IconButton>
      );
    }
    if (gUtils.isOPSModel(model)) {
      return (
        <IconButton icon={<SvgOPS />} variant="text" sx={{ color: 'info.light', fontSize: '1rem' }}>
          {defaultState}
        </IconButton>
      );
    }
    return <></>;
  }, [checked, model, deviceUUID, shareKey, handleChange]);
  return (
    <>
      <Hider show={isShow}>{stateView}</Hider>
    </>
  );
};

export default VIotSwitch;
