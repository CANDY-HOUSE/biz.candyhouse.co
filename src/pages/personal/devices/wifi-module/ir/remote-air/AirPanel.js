import React, { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';
import SwapVertRoundedIcon from '@mui/icons-material/SwapVertRounded';
import { useTranslation } from 'react-i18next';
import { AIR_MODES, AIR_OFF_COLORS, getAirMode } from '../utils/airState.js';
import SortableKeyGrid from '../components/SortableKeyGrid.js';
import { FanIcon, getWindDirectionIcon } from '../components/AirIcons.js';

const LONG_PRESS_MS = 450;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const FAN_SPIN_SECONDS = [2.4, 3.2, 1.8, 0.9];

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const noSelectSx = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
  cursor: 'pointer',
};

// 点按发码；按住不动约 0.45 秒 = 长按（弹编辑菜单，之后的 click 吞掉）；鼠标右键同样打开编辑菜单
const usePress = (onPress, onLongPress) => {
  const timer = useRef(null);
  const start = useRef(null);
  const fired = useRef(false);
  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };
  return {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      fired.current = false;
      cancel();
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        navigator.vibrate?.(15);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e) => {
      if (
        start.current &&
        Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > LONG_PRESS_MOVE_TOLERANCE
      )
        cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClick: () => {
      if (fired.current) {
        fired.current = false;
        return;
      }
      onPress();
    },
    onContextMenu: (e) => {
      e.preventDefault();
      if (!fired.current) onLongPress();
    },
  };
};

const Pressable = ({ item, onPress, onLongPress, sx, children }) => {
  const handlers = usePress(
    () => onPress(item),
    () => onLongPress(item)
  );
  return (
    <Box role="button" {...handlers} sx={[noSelectSx, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  );
};

const itemName = (item) => item.customName || item.title;

const RoundButton = ({ item, Icon, dimmed, busy, onPress, onLongPress }) => (
  <Pressable
    item={item}
    onPress={onPress}
    onLongPress={onLongPress}
    sx={{
      width: 56,
      height: 56,
      flexShrink: 0,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      bgcolor: 'rgba(255,255,255,0.2)',
      opacity: dimmed || busy ? 0.4 : 1,
      transition: 'transform 0.15s ease, opacity 0.2s ease',
      '&:active': { transform: 'scale(0.9)' },
    }}
  >
    <Icon sx={{ fontSize: 30 }} />
  </Pressable>
);

const PowerSegment = ({ item, active, color, busy, showIcon, onPress, onLongPress }) => (
  <Pressable
    item={item}
    onPress={onPress}
    onLongPress={onLongPress}
    sx={{
      flex: 1,
      minWidth: 0,
      height: 44,
      borderRadius: '22px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0.75,
      px: 1.5,
      bgcolor: active ? '#fff' : 'transparent',
      color: active ? color : 'rgba(255,255,255,0.92)',
      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
      opacity: busy ? 0.5 : 1,
      transition: 'background-color 0.25s ease, color 0.25s ease, opacity 0.2s ease',
      '&:active': { transform: 'scale(0.97)' },
    }}
  >
    {showIcon && <PowerSettingsNewRoundedIcon sx={{ fontSize: 20 }} />}
    <Typography noWrap sx={{ fontSize: 16, fontWeight: 600, color: 'inherit' }}>
      {itemName(item)}
    </Typography>
  </Pressable>
);

/**
 * 空调主控卡片：状态、温度（−/+）、开 / 关。controls 里缺少的按键（已被用户删除）不显示。
 *
 * @param {object}   p.state        空调页 currentState
 * @param {object}   p.controls     { power_on, power_off, temperature_display, temp_add, temp_reduce }，值为合并后的按键
 * @param {boolean}  p.canAdjustTemp 当前模式能否调温度
 * @param {{min, max}} p.tempRange
 * @param {string}   p.busyId       刚点过、还在防重复点击中的按键 id
 */
export const AirHero = ({ state, controls, canAdjustTemp, tempRange, busyId, onPress, onLongPress }) => {
  const { t } = useTranslation();
  const mode = getAirMode(state.mode);
  const [c0, c1] = state.power ? mode.colors : AIR_OFF_COLORS;
  const ModeIcon = mode.Icon;
  const { power_on: powerOn, power_off: powerOff, temperature_display: tempDisplay } = controls;
  const { temp_add: tempAdd, temp_reduce: tempReduce } = controls;
  const percent = ((state.temperature - tempRange.min) / (tempRange.max - tempRange.min)) * 100;
  const pressProps = { onPress, onLongPress };

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '28px',
        color: '#fff',
        px: 2.5,
        pt: 2.25,
        pb: 2.25,
        background: `linear-gradient(150deg, ${c0} 0%, ${c1} 100%)`,
        boxShadow: `0 14px 30px ${alpha(c0, 0.3)}`,
        transition: 'box-shadow 0.4s ease',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: '50%',
          right: -80,
          top: -110,
          bgcolor: 'rgba(255,255,255,0.1)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 150,
          height: 150,
          borderRadius: '50%',
          left: -60,
          bottom: -70,
          bgcolor: 'rgba(255,255,255,0.07)',
        }}
      />
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(255,255,255,0.2)',
            }}
          >
            <ModeIcon sx={{ fontSize: 19 }} />
          </Box>
          <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, color: 'inherit' }}>
            {t(mode.titleKey)}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              flexShrink: 0,
              px: 1.25,
              py: 0.5,
              borderRadius: '999px',
              bgcolor: 'rgba(255,255,255,0.2)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: state.power ? '#7CF2B4' : 'rgba(255,255,255,0.6)',
              }}
            />
            {t(state.power ? 'pages.ir.remote.airStatusOn' : 'pages.ir.remote.airStatusOff')}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 2.5 }}>
          {tempReduce ? (
            <RoundButton
              item={tempReduce}
              Icon={RemoveRoundedIcon}
              dimmed={!canAdjustTemp}
              busy={busyId === tempReduce.id}
              {...pressProps}
            />
          ) : (
            <Box sx={{ width: 56 }} />
          )}
          {tempDisplay && (
            <Pressable item={tempDisplay} {...pressProps} sx={{ cursor: 'default', textAlign: 'center', minWidth: 0 }}>
              <Typography
                sx={{
                  color: 'inherit',
                  fontSize: 84,
                  fontWeight: 200,
                  lineHeight: 1,
                  letterSpacing: '-3px',
                  fontVariantNumeric: 'tabular-nums',
                  opacity: canAdjustTemp ? 1 : 0.75,
                }}
              >
                {state.temperature}
                <Box
                  component="span"
                  sx={{ fontSize: 28, fontWeight: 400, letterSpacing: 0, verticalAlign: 'top', ml: 0.5 }}
                >
                  °C
                </Box>
              </Typography>
            </Pressable>
          )}
          {tempAdd ? (
            <RoundButton
              item={tempAdd}
              Icon={AddRoundedIcon}
              dimmed={!canAdjustTemp}
              busy={busyId === tempAdd.id}
              {...pressProps}
            />
          ) : (
            <Box sx={{ width: 56 }} />
          )}
        </Box>

        {tempDisplay && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mx: 'auto',
              mt: 2,
              width: '72%',
              fontSize: 11,
              opacity: 0.8,
            }}
          >
            <span>{tempRange.min}°</span>
            <Box sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.25)', position: 'relative' }}>
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${percent}%`,
                  borderRadius: 2,
                  bgcolor: '#fff',
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
            <span>{tempRange.max}°</span>
          </Box>
        )}

        {(powerOn || powerOff) && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 2.5, p: 0.5, borderRadius: '26px', bgcolor: 'rgba(0,0,0,0.14)' }}>
            {powerOn && (
              <PowerSegment
                item={powerOn}
                active={state.power}
                color={c1}
                busy={busyId === powerOn.id}
                showIcon
                {...pressProps}
              />
            )}
            {powerOff && (
              <PowerSegment
                item={powerOff}
                active={!state.power}
                color={c1}
                busy={busyId === powerOff.id}
                {...pressProps}
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// 当前档位的圆点颜色跟随父级的 color
const StepDots = ({ count, index }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    {Array.from({ length: count }, (_, i) => (
      <Box
        key={i}
        sx={{
          width: i === index ? 14 : 5,
          height: 5,
          borderRadius: '3px',
          bgcolor: i === index ? 'currentColor' : 'action.disabled',
          transition: 'width 0.25s ease, background-color 0.25s ease',
        }}
      />
    ))}
  </Box>
);

/**
 * 模式 / 风量 / 风向 / 摆风四个功能块：点一下切到下一档；圆点表示当前在第几档。
 * 按住约 0.4 秒不动松开 = 长按（编辑菜单），按住拖动 = 排序（与下方按键网格同一套交互）。
 *
 * @param {object[]} p.items     已按当前顺序排好的功能块按键（presetId 为 mode / fan_speed / wind_direction / auto_swing）
 * @param {function} p.onReorder (newIds: string[]) => void
 */
export const AirFunctionTiles = ({ state, items, busyId, onPress, onLongPress, onReorder }) => {
  const tileMeta = {
    mode: {
      Icon: getAirMode(state.mode).Icon,
      color: getAirMode(state.mode).colors[0],
      count: AIR_MODES.length,
      index: state.mode,
    },
    fan_speed: {
      Icon: FanIcon,
      count: 4,
      index: state.fanSpeed,
      iconSx: state.power
        ? {
            animation: `${spin} ${FAN_SPIN_SECONDS[state.fanSpeed] || 2.4}s linear infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }
        : undefined,
    },
    wind_direction: {
      Icon: getWindDirectionIcon(state.windDirection),
      count: 3,
      index: state.windDirection,
    },
    auto_swing: {
      Icon: SwapVertRoundedIcon,
      count: 2,
      index: state.autoSwing ? 0 : 1,
      muted: !state.autoSwing,
    },
  };

  if (items.length === 0) return null;

  return (
    <SortableKeyGrid
      items={items}
      cols={2}
      gap={12}
      cellHeight={104}
      onReorder={onReorder}
      onLongPress={onLongPress}
      renderItem={(item) => {
        const { Icon, color, count, index, iconSx, muted } = tileMeta[item.presetId];
        return (
          <Box
            role="button"
            onClick={() => onPress(item)}
            sx={(theme) => {
              const tint = muted ? theme.palette.text.secondary : color || theme.palette.primary.main;
              return {
                ...noSelectSx,
                height: '100%',
                boxSizing: 'border-box',
                borderRadius: '18px',
                p: 1.75,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                bgcolor: 'action.hover',
                opacity: busyId === item.id ? 0.55 : 1,
                transition: 'transform 0.15s ease, opacity 0.2s ease',
                '&:active': { transform: 'scale(0.97)' },
                '& .air-tile-icon': { bgcolor: alpha(tint, 0.14), color: tint },
                '& .air-tile-dot': { color: tint },
              };
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box
                className="air-tile-icon"
                sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center' }}
              >
                <Icon sx={{ fontSize: 22, ...iconSx }} />
              </Box>
              <Box className="air-tile-dot" sx={{ display: 'flex' }}>
                <StepDots count={count} index={index} />
              </Box>
            </Box>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.25,
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {itemName(item)}
            </Typography>
          </Box>
        );
      }}
    />
  );
};
