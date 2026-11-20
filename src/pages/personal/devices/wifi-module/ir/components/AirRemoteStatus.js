import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';
import { useTranslation } from 'react-i18next';
import { AIR_FAN_SPEED_KEYS, AIR_OFF_COLORS, getAirMode, parseAirState } from '../utils/airState.js';
import { FanIcon, getWindDirectionIcon } from './AirIcons.js';

const MAX_SUMMARY_DOTS = 3;
// 风量角标，同原空调页风量图标上的 A / 1 / 2 / 3
const FAN_SPEED_MARKS = ['A', '1', '2', '3'];
const WIND_DIRECTION_KEYS = [
  'pages.ir.remote.windDirectionUp',
  'pages.ir.remote.windDirectionCenter',
  'pages.ir.remote.windDirectionDown',
];

// 一台空调的状态圆点：开机为模式颜色 + 模式图标，关机为灰色电源图标；外圈留白，叠在一起时分得开
const AirDot = ({ state, title, sx }) => {
  const { t } = useTranslation();
  const mode = getAirMode(state.mode);
  const color = state.power ? mode.colors[0] : AIR_OFF_COLORS[0];
  const Icon = state.power ? mode.Icon : PowerSettingsNewRoundedIcon;
  return (
    <Box
      title={title || t(state.power ? mode.titleKey : 'pages.ir.remote.airStatusOff')}
      sx={{ p: '2px', borderRadius: '50%', bgcolor: 'background.paper', flexShrink: 0, ...sx }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(color, 0.14),
          color,
        }}
      >
        <Icon sx={{ fontSize: 17 }} />
      </Box>
    </Box>
  );
};

/**
 * 首页 Hub3 卡片右侧的空调示意（详细信息展开遥控器列表看）：
 *   - 一台空调：状态圆点，开机时再加温度
 *   - 多台空调：每台一个状态圆点叠在一起（最多 3 个，其余显示 +N）
 * 点击展开遥控器列表（已展开时由调用方忽略）。只算空调遥控器，其他品类和自学习遥控器没有状态，不显示。
 * 状态是最近一次发出的设定，从没操作过时为空调页的默认状态。没有空调遥控器时不显示。
 *
 * @param {object[]} p.remoteList Hub3 的遥控器列表（stateInfo.remoteList）
 * @param {function} p.onExpand   () => void
 */
export const AirStatusSummary = ({ remoteList, onExpand, sx }) => {
  const entries = useMemo(
    () => (remoteList || []).map((remote) => ({ remote, state: parseAirState(remote) })).filter((e) => e.state),
    [remoteList]
  );
  if (entries.length === 0) return null;

  const single = entries.length === 1 ? entries[0] : null;
  const shown = entries.slice(0, MAX_SUMMARY_DOTS);
  const extra = entries.length - shown.length;

  return (
    <Box
      role="button"
      aria-label={entries.map((e) => e.remote.alias).join(', ')}
      onClick={(e) => {
        e.stopPropagation();
        onExpand();
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        flexShrink: 0,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'opacity 0.15s ease',
        '&:active': { opacity: 0.6 },
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {shown.map(({ remote, state }, i) => (
          <AirDot
            key={remote.uuid || i}
            state={state}
            title={remote.alias}
            sx={{ ml: i === 0 ? 0 : '-10px', zIndex: shown.length - i }}
          />
        ))}
        {extra > 0 && (
          <Box sx={{ p: '2px', ml: '-10px', borderRadius: '50%', bgcolor: 'background.paper' }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'action.selected',
                fontSize: 12,
                fontWeight: 600,
                color: 'text.secondary',
              }}
            >
              +{extra}
            </Box>
          </Box>
        )}
      </Box>
      {single?.state.power && (
        <Typography
          sx={{
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: '-1px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {single.state.temperature}
          <Box component="span" sx={{ fontSize: 15, fontWeight: 500, letterSpacing: 0, ml: '2px' }}>
            °C
          </Box>
        </Typography>
      )}
    </Box>
  );
};

/**
 * 遥控器列表一行右侧的空调状态，只用图标：开机为 模式图标、温度、风量（带档位角标）、风向；关机只显示电源图标。
 * 不是空调遥控器时不显示。鼠标悬停时 title 给出文字说明。
 */
export const AirStatusInline = ({ remote }) => {
  const { t } = useTranslation();
  const state = useMemo(() => parseAirState(remote), [remote]);
  if (!state) return null;

  if (!state.power) {
    return (
      <Box
        title={t('pages.ir.remote.airStatusOff')}
        sx={{ display: 'flex', flexShrink: 0, mx: 1, color: 'text.disabled' }}
      >
        <PowerSettingsNewRoundedIcon sx={{ fontSize: 18 }} />
      </Box>
    );
  }

  const mode = getAirMode(state.mode);
  const WindIcon = getWindDirectionIcon(state.windDirection);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, mx: 1, color: 'text.secondary' }}>
      <Box title={t(mode.titleKey)} sx={{ display: 'flex', color: mode.colors[0] }}>
        <mode.Icon sx={{ fontSize: 17 }} />
      </Box>
      <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
        {state.temperature}°
      </Typography>
      <Box title={t(AIR_FAN_SPEED_KEYS[state.fanSpeed])} sx={{ position: 'relative', display: 'flex', pr: '5px' }}>
        <FanIcon sx={{ fontSize: 16 }} />
        <Box
          component="span"
          sx={{ position: 'absolute', right: 0, bottom: -3, fontSize: 9, fontWeight: 700, lineHeight: 1 }}
        >
          {FAN_SPEED_MARKS[state.fanSpeed]}
        </Box>
      </Box>
      <Box title={t(WIND_DIRECTION_KEYS[state.windDirection])} sx={{ display: 'flex' }}>
        <WindIcon sx={{ fontSize: 17 }} />
      </Box>
    </Box>
  );
};
