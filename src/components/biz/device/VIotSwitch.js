import { isAppLockModel } from '@/services/appLockSettings';
import { deviceService, isAppHome } from '@/services/deviceService';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { Box, IconButton } from '@mui/material';
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import Hider from '@/components/biz/Hider';
import { PngBotIcon, SvgLock, SvgLockDisable, SvgOPS, SvgUnLock } from '@/assets/svg/svgLock';
import { gUtils } from '@/utils/gUtils';
import { gConfig } from '@/constants/gConfig';
import { keyframes } from '@mui/system';

// Bike / Bot 执行指令后按钮左右抖动（3% 宽度，60ms 往返），持续 1.5 秒
const shake = keyframes`from { transform: translateX(-3%); } to { transform: translateX(3%); }`;
const isShakeModel = (model) =>
  gUtils.isBotModel(model) ||
  model === gConfig.sesameDeviceModel.ssm_bike2 ||
  model === gConfig.sesameDeviceModel.ssm_bike3;

const VIotSwitch = ({
  gIot,
  deviceUUID,
  shareKey,
  model = 'ssm_touch_pro',
  defaultState = undefined,
  relayIndex = gConfig.hub3RelayId.relay1,
  relayEnabled = true,
  onCommand,
  onCommandStart,
  position,
  large = false,
  botIndex,
  disabled = false,
}) => {
  const { setSnackbarValue } = useContext(GlobalStateContext);
  const inFlight = useRef(false);
  const lastCommandAt = useRef(-Infinity);
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef();
  const stopShake = () => {
    clearTimeout(shakeTimer.current);
    setShaking(false);
  };
  useEffect(() => () => clearTimeout(shakeTimer.current), []);
  const execute = async (command) => {
    const lock = gUtils.isLockModel(model);
    const now = performance.now();
    if (disabled || inFlight.current || (lock && now - lastCommandAt.current < 1000)) return;
    lastCommandAt.current = now;
    inFlight.current = true;
    if (isShakeModel(model)) {
      clearTimeout(shakeTimer.current);
      setShaking(true);
      shakeTimer.current = setTimeout(stopShake, 1500);
    }
    try {
      if (lock && isAppHome) deviceService.notify('haptic', { duration: 100 });
      onCommandStart?.();
      await command();
    } catch (error) {
      stopShake();
      setSnackbarValue?.({
        logScope: 'components/biz/device/VIotSwitch.execute',
        severity: 'error',
        open: true,
        msg: error.message,
      });
    } finally {
      inFlight.current = false;
    }
  };
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
    execute(() => (onCommand ? onCommand() : gIot.sendCommandToWM2({ device_id: deviceUUID, sescretKey: shareKey })));
  };

  const stateView = useMemo(() => {
    if (gUtils.isBotModel(model)) {
      return (
        <IconButton
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            execute(() =>
              onCommand
                ? onCommand()
                : gIot.sendCommandToWM2({
                    device_id: deviceUUID,
                    sescretKey: shareKey,
                    cmd: Number.isInteger(botIndex) ? 170 + botIndex : 89,
                  })
            );
          }}
        >
          {checked === undefined ? <PngBotIcon state={-1} /> : <PngBotIcon state={0} />}
        </IconButton>
      );
    }
    if (gUtils.isLockModel(model)) {
      return (
        <IconButton disabled={disabled} onClick={handleChange}>
          {checked === undefined ? <SvgLockDisable /> : checked ? <SvgUnLock /> : <SvgLock />}
        </IconButton>
      );
    }
    if (gUtils.isOPSModel(model)) {
      return (
        <IconButton>
          <SvgOPS label={defaultState} size={large ? 88 : 51} />
        </IconButton>
      );
    }
    if (gUtils.isHub3Pro(model)) {
      const disabled = relayEnabled === false;
      return (
        <IconButton
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            // 持续开/关：当前为开(checked=true) -> 发关，否则 -> 发开
            const action = checked ? gConfig.hub3RelayAction.off : gConfig.hub3RelayAction.on;
            execute(() =>
              gIot.sendCommandToHub3WithConnectionId({
                device_id: deviceUUID,
                secretKey: shareKey,
                cmd: gConfig.cmdCode.HUB3_ITEM_CODE_RELAY_SWITCH,
                iotPayload: { relayId: relayIndex, action },
              })
            );
          }}
        >
          {disabled || checked === undefined ? <SvgLockDisable /> : checked ? <SvgUnLock /> : <SvgLock />}
        </IconButton>
      );
    }
    return <></>;
  }, [checked, model, deviceUUID, shareKey, handleChange, relayIndex, relayEnabled, onCommand, botIndex, large]);
  return (
    <>
      <Hider show={isShow}>
        <Box
          sx={{
            position: 'relative',
            display: 'inline-flex',
            ...(shaking ? { animation: `${shake} 60ms linear infinite alternate` } : {}),
            ...(large ? { '& img': { width: '88px !important', height: '88px !important' } } : {}),
          }}
        >
          {stateView}
          {Number.isFinite(position) && isAppLockModel(model) && (
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: large ? 88 : 51,
                height: large ? 88 : 51,
                transform: `translate(-50%, -50%) rotate(${-position}deg)`,
                pointerEvents: 'none',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  right: -3,
                  top: '50%',
                  width: large ? 8 : 6,
                  height: large ? 8 : 6,
                  borderRadius: '50%',
                  bgcolor: checked === undefined ? 'info.light' : checked ? 'primary.main' : '#c74740',
                  transform: 'translateY(-50%)',
                }}
              />
            </Box>
          )}
        </Box>
      </Hider>
    </>
  );
};

export default VIotSwitch;
