import { IconButton } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import Hider from '@/components/biz/Hider';
import { PngBotIcon, SvgLock, SvgLockDisable, SvgOPS, SvgUnLock } from '@/assets/svg/svgLock';
import { gUtils } from '@/utils/gUtils';
import { gConfig } from '@/constants/gConfig';

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
        <IconButton>
          <SvgOPS label={defaultState} />
        </IconButton>
      );
    }
    if (gUtils.isHub3LTE(model)) {
      return (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            gIot.sendCommandToHub3WithConnectionId({
              device_id: deviceUUID,
              secretKey: shareKey,
              cmd: gConfig.cmdCode.HUB3_ITEM_CODE_RELAY_SWITCH,
              iotPayload: { op: 0x01 },
            });
          }}
        >
          {checked === undefined ? <SvgLockDisable /> : checked ? <SvgUnLock /> : <SvgLock />}
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
