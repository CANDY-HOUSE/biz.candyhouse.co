import React, { useEffect, useState } from 'react';
import { Box, Collapse, Divider, ListItem, ListItemText, Typography } from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  RadioButtonChecked,
  RadioButtonUnchecked,
  WarningAmberRounded,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// 仅 Hub3 Pro：网络掉线次数（展开显示各网络 1 小时内掉线次数）/ 接入方式。
//
// 数据来自 stateInfo.netSwitchInfo（设备上报 → hub3_status.net_switch_info）。
// 设备（固件带 net_switch_info 上报的版本）尚未上报时不显示数值，只显示「—」。
// 「掉线多少次算不稳定」以设备上报的 dropLimit 为准，页面不写死阈值。

const NET_LABEL_KEYS = {
  ethernet: 'NetEthernet',
  wifi: 'NetWifi',
  lte: 'NetSim',
};

// 显示顺序与设备优先级一致：LAN > WiFi > LTE
const NET_ORDER = ['ethernet', 'wifi', 'lte'];
const DROP_FIELDS = { ethernet: 'ethDrop', wifi: 'wifiDrop', lte: 'lteDrop' };

const formatDuration = (t, minutes) => {
  const m = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(m / 60);
  return h > 0
    ? t('pages.sesameAccessControlDevice.index.DurationHourMin', { h, m: m % 60 })
    : t('pages.sesameAccessControlDevice.index.DurationMin', { m });
};

// 网络状态行与本组件共用，保证两处取数一致；设备未上报时为 null
export const resolveNetSwitchInfo = (info) => info || null;

// 网络类型的显示名：ethernet → LAN，lte → LTE ...
export const netTypeLabel = (t, net) =>
  NET_LABEL_KEYS[net] ? t(`pages.sesameAccessControlDevice.index.${NET_LABEL_KEYS[net]}`) : '';

// onSetAccessMode(mode)：下发接入方式（'auto' | 'ethernet' | 'wifi' | 'lte'），由父组件负责发送 IoT 指令
const Hub3ProNetworkSwitch = ({ info, connectivity = {}, onSetAccessMode }) => {
  const { t } = useTranslation();
  const [dropOpen, setDropOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  // 已下发、等待设备上报确认的接入方式（设备经 shadow 回报 mode 后清除）
  const [pendingMode, setPendingMode] = useState(null);

  const data = resolveNetSwitchInfo(info);
  const k = (key, opts) => t(`pages.sesameAccessControlDevice.index.${key}`, opts);
  const netName = (net) => netTypeLabel(t, net) || '—';

  const currentMode = data?.mode || 'auto';
  useEffect(() => {
    if (pendingMode && pendingMode === currentMode) setPendingMode(null);
  }, [pendingMode, currentMode]);

  const handleSelectMode = (value) => {
    if (!onSetAccessMode || value === (pendingMode || currentMode)) return;
    setPendingMode(value);
    onSetAccessMode(value);
  };

  // 各网络 1 小时内掉线次数；达到设备阈值的视为不稳定（设备会暂时改用其它网络）
  const dropLimit = Number(data?.dropLimit) || 0;
  const linkDrops = NET_ORDER.map((net) => [net, Number(data?.[DROP_FIELDS[net]]) || 0]);
  const isUnstableCount = (n) => dropLimit > 0 && n >= dropLimit;
  const unstableLinks = linkDrops.filter(([, n]) => isUnstableCount(n));
  const totalDrops = linkDrops.reduce((sum, [, n]) => sum + n, 0);
  const hintLinks = unstableLinks
    .map(([net, n]) => k('NetLinkDropped', { net: netName(net), n }))
    .join(k('NetLinkSeparator'));
  const activeNet = data?.active && data.active !== 'none' ? data.active : null;
  const usingAlternative = activeNet && !unstableLinks.some(([net]) => net === activeNet);

  const valueColor = { color: 'title.other' };
  const warnColor = { color: 'warning.main' };

  const modeLabel = !data
    ? '—'
    : currentMode !== 'auto'
      ? `${k('AccessModeFixedTo')}${netName(currentMode)}`
      : k('AccessModeAuto');

  const detailRow = (label, value, sx) => (
    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" sx={{ color: 'title.other' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={sx}>
        {value}
      </Typography>
    </Box>
  );

  const modeOption = (value, label, desc, descColor) => {
    const checked = (pendingMode || currentMode) === value;
    const isPending = pendingMode === value;
    return (
      <Box
        key={value}
        onClick={() => handleSelectMode(value)}
        sx={{ display: 'flex', gap: 1, py: 0.75, cursor: onSetAccessMode ? 'pointer' : 'default' }}
      >
        {checked ? (
          <RadioButtonChecked fontSize="small" sx={{ color: 'primary.main', mt: '2px' }} />
        ) : (
          <RadioButtonUnchecked fontSize="small" sx={{ color: 'title.other', mt: '2px' }} />
        )}
        <Box>
          <Typography variant="body2">
            {label}
            {isPending && (
              <Typography component="span" variant="caption" sx={{ color: 'title.other', ml: 1 }}>
                {k('AccessModeSetting')}
              </Typography>
            )}
          </Typography>
          <Typography variant="caption" sx={{ color: descColor || 'title.other' }}>
            {desc}
          </Typography>
        </Box>
      </Box>
    );
  };

  // 三种网络统一：已连接灰字；未连接用警告色提示「选择后会暂时使用其它网络」
  const linkState = (net) => (connectivity[net] ? [k('NetConnected')] : [k('AccessModeOfflineWarn'), 'warning.main']);

  return (
    <>
      <ListItem onClick={() => setDropOpen((v) => !v)} sx={{ cursor: 'pointer' }}>
        <ListItemText primary={k('NetworkDrops')} />
        <Typography sx={unstableLinks.length ? warnColor : valueColor}>
          {data ? k('SwitchesIn1h', { n: totalDrops }) : '—'}
        </Typography>
        {dropOpen ? <ExpandLess sx={valueColor} /> : <ExpandMore sx={valueColor} />}
      </ListItem>
      <Collapse in={dropOpen} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 1.5 }}>
          {!data ? (
            <Typography variant="body2" sx={valueColor}>
              {k('NetSwitchNoData')}
            </Typography>
          ) : (
            <>
              {unstableLinks.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, pb: 0.5 }}>
                  <WarningAmberRounded fontSize="small" sx={{ ...warnColor, mt: '2px' }} />
                  <Typography variant="body2" sx={warnColor}>
                    {usingAlternative
                      ? k('NetworkUnstableHint', { links: hintLinks, net: netName(activeNet) })
                      : k('NetworkUnstableHintNoAlt', { links: hintLinks })}
                  </Typography>
                </Box>
              )}
              {linkDrops.map(([net, n]) =>
                detailRow(k('DropsOfLink', { net: netName(net) }), n, isUnstableCount(n) ? warnColor : undefined)
              )}
              {detailRow(
                k('CurrentNetworkOnline'),
                data.since > 0 ? formatDuration(t, (Date.now() - data.since) / 60000) : '—'
              )}
              {dropLimit > 0 && (
                <Typography variant="caption" sx={{ ...valueColor, display: 'block', mt: 0.5 }}>
                  {k('NetSwitchRule', { n: dropLimit })}
                </Typography>
              )}
            </>
          )}
        </Box>
      </Collapse>
      <Divider variant="middle" sx={{ opacity: 0.4 }} />

      <ListItem onClick={() => setModeOpen((v) => !v)} sx={{ cursor: 'pointer' }}>
        <ListItemText primary={k('AccessMode')} />
        <Typography sx={valueColor}>{modeLabel}</Typography>
        {modeOpen ? <ExpandLess sx={valueColor} /> : <ExpandMore sx={valueColor} />}
      </ListItem>
      <Collapse in={modeOpen} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 1.5 }}>
          {modeOption('auto', k('AccessModeAutoRecommended'), k('AccessModeAutoDesc'))}
          {modeOption('ethernet', k('AccessModeOnlyEthernet'), ...linkState('ethernet'))}
          {modeOption('lte', k('AccessModeOnlySim'), ...linkState('lte'))}
          {modeOption('wifi', k('AccessModeOnlyWifi'), ...linkState('wifi'))}
          <Typography variant="caption" sx={{ ...valueColor, display: 'block', mt: 0.5 }}>
            {k('AccessModeNote')}
          </Typography>
        </Box>
      </Collapse>
    </>
  );
};

export default Hub3ProNetworkSwitch;
