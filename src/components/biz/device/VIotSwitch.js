import { IconButton } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import Hider from '@/components/biz/Hider';
import { PngBotIcon, SvgLock, SvgLockDisable, SvgOPS, SvgUnLock } from '@/assets/svg/svgLock';
import { gUtils } from '@/utils/gUtils';
import { gConfig } from '@/constants/gConfig';

const VIotSwitch = ({
  gIot,
  deviceUUID,
  shareKey,
  model = 'ssm_touch_pro',
  defaultState = undefined,
  relayIndex = gConfig.hub3RelayId.relay1,
  relayEnabled = true,
}) => {
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
      const disabled = relayEnabled === false;
      return (
        <IconButton
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            // 持续开/关：当前为开(checked=true) -> 发关，否则 -> 发开
            const action = checked ? gConfig.hub3RelayAction.off : gConfig.hub3RelayAction.on;
            gIot.sendCommandToHub3WithConnectionId({
              device_id: deviceUUID,
              secretKey: shareKey,
              cmd: gConfig.cmdCode.HUB3_ITEM_CODE_RELAY_SWITCH,
              iotPayload: { relayId: relayIndex, action },
            });
          }}
        >
          {disabled || checked === undefined ? <SvgLockDisable /> : checked ? <SvgUnLock /> : <SvgLock />}
        </IconButton>
      );
    }
    return <></>;
  }, [checked, model, deviceUUID, shareKey, handleChange, relayIndex, relayEnabled]);
  return (
    <>
      <Hider show={isShow}>{stateView}</Hider>
    </>
  );
};

export default VIotSwitch;
