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
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { ios } from '@/theme/appHomeStyle';

const tintedTones = {
  locked: { bg: ios.redFill, fg: ios.red },
  unlocked: { bg: ios.tintFill, fg: ios.tint },
  unknown: { bg: ios.fill, fg: '#AEAEB2' },
};
const TintedIcon = ({ size, tone, Icon }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: tintedTones[tone].bg,
      color: tintedTones[tone].fg,
      transition: `background-color 0.25s ease, color 0.25s ease, transform 0.2s ${ios.spring}`,
    }}
  >
    {Icon ? <Icon sx={{ fontSize: Math.round(size * 0.46) }} /> : null}
  </Box>
);
const lockTone = (checked) => (checked === undefined ? 'unknown' : checked ? 'unlocked' : 'locked');

// Bike / Bot 执行指令后按钮左右抖动（3% 宽度，60ms 往返），持续 1.5 秒
const shake = keyframes`from { transform: translateX(-3%); } to { transform: translateX(3%); }`;
const isShakeModel = (model) =>
  gUtils.isBotModel(model) ||
  model === gConfig.sesameDeviceModel.bike_1 ||
  model === gConfig.sesameDeviceModel.ssm_bike2 ||
  model === gConfig.sesameDeviceModel.ssm_bike3;
// Bike 1 不属于 isLockModel（列表点击直接进入设置页），但列表中同样显示开锁按钮
const isLockButtonModel = (model) => gUtils.isLockModel(model) || model === gConfig.sesameDeviceModel.bike_1;

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
  size = 51,
  tinted = false,
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
    const lock = isLockButtonModel(model);
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
          {tinted ? (
            <TintedIcon size={size} tone={checked === undefined ? 'unknown' : 'unlocked'} Icon={PlayArrowRoundedIcon} />
          ) : checked === undefined ? (
            <PngBotIcon state={-1} />
          ) : (
            <PngBotIcon state={0} />
          )}
        </IconButton>
      );
    }
    if (isLockButtonModel(model)) {
      return (
        <IconButton disabled={disabled} onClick={handleChange}>
          {tinted ? (
            <TintedIcon size={size} tone={lockTone(checked)} Icon={checked ? LockOpenRoundedIcon : LockRoundedIcon} />
          ) : checked === undefined ? (
            <SvgLockDisable />
          ) : checked ? (
            <SvgUnLock />
          ) : (
            <SvgLock />
          )}
        </IconButton>
      );
    }
    if (gUtils.isOPSModel(model)) {
      return (
        <IconButton>
          {tinted ? (
            <Box
              sx={{
                minWidth: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: ios.secondaryLabel,
                fontSize: 15,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {defaultState}
            </Box>
          ) : (
            <SvgOPS label={defaultState} size={size} />
          )}
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
          {tinted ? (
            <TintedIcon
              size={size}
              tone={disabled ? 'unknown' : lockTone(checked)}
              Icon={checked && !disabled ? LockOpenRoundedIcon : LockRoundedIcon}
            />
          ) : disabled || checked === undefined ? (
            <SvgLockDisable />
          ) : checked ? (
            <SvgUnLock />
          ) : (
            <SvgLock />
          )}
        </IconButton>
      );
    }
    return <></>;
  }, [checked, model, deviceUUID, shareKey, handleChange, relayIndex, relayEnabled, onCommand, botIndex, size, tinted]);
  return (
    <>
      <Hider show={isShow}>
        <Box
          sx={{
            position: 'relative',
            display: 'inline-flex',
            ...(shaking ? { animation: `${shake} 60ms linear infinite alternate` } : {}),
            ...(tinted ? { '& .MuiIconButton-root:active > div': { transform: 'scale(0.9)' } } : {}),
            ...(size !== 51 ? { '& img': { width: `${size}px !important`, height: `${size}px !important` } } : {}),
          }}
        >
          {stateView}
          {Number.isFinite(position) && isAppLockModel(model) && (
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: size,
                height: size,
                transform: `translate(-50%, -50%) rotate(${-position}deg)`,
                pointerEvents: 'none',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  right: tinted ? 5 : -3,
                  top: '50%',
                  width: size > 51 ? 8 : 6,
                  height: size > 51 ? 8 : 6,
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
