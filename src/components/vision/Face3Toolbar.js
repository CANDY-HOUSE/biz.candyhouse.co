import React, { useEffect, useState } from 'react';
import { Box, ButtonBase, SvgIcon, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * 详情页画面正下方的工具栏，以及工具用到的图标和录制计时。
 *
 * 同一位置按画面框里放的内容换：
 *   实时（及什么都没放）—— Face3LiveToolbar：拍照、录制、视频对讲
 *   选中了一条录像        —— Face3RecordingToolbar：下载、删除（连同 AI 一行三格，见 Face3DevicePanel）
 * 第一格固定是 Face3AiTool（AI 开关）。
 */

/* ── 图标 ──────────────────────────────────────────────────────────────────
 * 细线描边风格（圆角、无填充）。MUI 自带的 Outlined 图标镜头三角等部位仍是实心的，
 * 与设计参考不符，这里自绘。颜色跟随 currentColor（按下 / 开着时由外层变主题色）。 */
const LineIcon = ({ children, ...props }) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  </SvgIcon>
);

/** 拍照：相机 */
const SnapshotLineIcon = () => (
  <LineIcon>
    <path d="M4.5 7.5h2.8l1.5-2h6.4l1.5 2h2.8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V9a1.5 1.5 0 0 1 1.5-1.5z" />
    <circle cx="12" cy="13" r="3.25" />
  </LineIcon>
);

/** 录制：通用的录制按钮（圆环 + 实心圆点） */
const RecordLineIcon = () => (
  <LineIcon>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
  </LineIcon>
);

/** 视频对讲：摄像机（机身 + 镜头），把本机画面送到门口屏 */
const VideoCallLineIcon = () => (
  <LineIcon>
    <rect x="3" y="6.5" width="12.5" height="11" rx="2" />
    <path d="M15.5 10.5l4.7-2.7a.5.5 0 0 1 .8.43v7.54a.5.5 0 0 1-.8.43l-4.7-2.7" />
  </LineIcon>
);

/** AI：数字机器人头像（天线、圆角头、两侧耳朵、竖线眼睛、一字嘴） */
const AiBotLineIcon = () => (
  <LineIcon>
    <circle cx="12" cy="2.75" r="1" />
    <path d="M12 3.75V6" />
    <rect x="4.5" y="6" width="15" height="12.5" rx="3.5" />
    <path d="M2.5 10.75v3.5M21.5 10.75v3.5" />
    <path d="M9.25 10.5v2M14.75 10.5v2M10 15.25h4" />
  </LineIcon>
);

/** 下载：向下箭头 + 托盘 */
const DownloadLineIcon = () => (
  <LineIcon>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
    <path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
  </LineIcon>
);

/** 删除：垃圾桶 */
const DeleteLineIcon = () => (
  <LineIcon>
    <path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19l1-12M10 11v6M14 11v6" />
  </LineIcon>
);

/* ── 录制计时 ────────────────────────────────────────────────────────────── */

const formatElapsed = (ms) => {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

/**
 * 录制计时 mm:ss（工具栏文字和画面上的 REC 共用）。
 * 自己计时、自己刷新：只重渲这一小段文字，不带着整个实时画面组件重渲。
 * 每次在录制时长跨过整秒时刷新 —— 每秒只渲染一次，两处计时同步跳。
 */
export function RecordingClock({ startedAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      timer = setTimeout(tick, 1000 - ((current - startedAt) % 1000));
    };
    tick();
    return () => clearTimeout(timer);
  }, [startedAt]);
  return formatElapsed(Math.max(0, now - startedAt));
}

/* ── 工具 ────────────────────────────────────────────────────────────────── */

/* 同一个工具两次按下间隔不到这么久，后一次不算（防连点：开始录制马上又停、对讲开了又关） */
const TOOL_PRESS_GAP_MS = 1000;

/**
 * 一个工具：图标在上、文字在下（参考 Wyze）；按下 / 开着时图标和文字都是主题色，不可用时灰色。
 * 防连点：上次按下的时刻记在按钮元素上（data-pressed-at），不为它挂钩子。
 */
const LiveTool = ({ icon, label, ariaLabel = label, active, disabled, onClick, labelEnd }) => {
  const handleClick = (event) => {
    const button = event.currentTarget;
    const now = Date.now();
    if (now - Number(button.dataset.pressedAt || 0) < TOOL_PRESS_GAP_MS) return;
    button.dataset.pressedAt = String(now);
    onClick?.(event);
  };
  return (
    <ButtonBase
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={Boolean(active)}
      aria-label={ariaLabel}
      sx={{
        flex: 1,
        flexDirection: 'column',
        py: 1.25,
        color: active ? 'primary.main' : 'text.primary',
        '& .MuiSvgIcon-root': { fontSize: 28 },
        '&.Mui-disabled': { color: 'text.disabled' },
      }}
    >
      {icon}
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          component="span"
          sx={{ fontSize: 13, lineHeight: 1.2, color: 'inherit', fontVariantNumeric: 'tabular-nums' }}
        >
          {label}
        </Typography>
        {labelEnd}
      </Box>
    </ButtonBase>
  );
};

/**
 * 文字旁的迷你开关（只是样子，不是控件：整个工具格就是按钮，按钮里不能再套开关）。
 * 开：主题色底、圆点在右；关：灰底、圆点在左。状态由按钮的 aria-pressed 告诉读屏。
 */
const MiniSwitch = ({ on }) => (
  <Box
    component="span"
    aria-hidden="true"
    sx={{
      position: 'relative',
      width: 22,
      height: 12,
      borderRadius: 6,
      bgcolor: on ? 'primary.main' : 'grey.400',
      transition: 'background-color 150ms',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 2,
        left: on ? 12 : 2,
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: 'common.white',
        transition: 'left 150ms',
      },
    }}
  />
);

const toolbarSx = { display: 'flex', bgcolor: 'background.paper' };

/**
 * 实时工具栏：拍照、录制、视频对讲。
 *   没在看实时（或还没出画）时三个都是灰色、不可点（disabled，详情页自己渲染这一份）；
 *   出画后由 Face3LiveView 渲染可用的那一份（经 portal 放到同一位置），带上各工具的状态和回调。
 * recordStartedAt：录制开始的时刻（ms），0 = 没在录。
 */
export function Face3LiveToolbar({
  disabled = false,
  snapshotBusy = false,
  onSnapshot,
  recordStartedAt = 0,
  recordSaving = false,
  onRecord,
  videoCallOn = false,
  videoCallReady = true,
  onVideoCall,
}) {
  const { t } = useTranslation();
  const recording = recordStartedAt > 0;
  return (
    <Box sx={toolbarSx}>
      {/* 拍照：截图、保存的这一小段时间亮起 */}
      <LiveTool
        label={t('face3.snapshot')}
        active={snapshotBusy}
        disabled={disabled}
        onClick={onSnapshot}
        icon={<SnapshotLineIcon />}
      />
      {/* 录制：录制中（及停止后保存的片刻）亮起，文字换成计时；再按一次停止并保存 */}
      <LiveTool
        label={recording ? <RecordingClock startedAt={recordStartedAt} /> : t('face3.record')}
        ariaLabel={t(recording ? 'face3.recordStop' : 'face3.record')}
        active={recording || recordSaving}
        disabled={disabled}
        onClick={onRecord}
        icon={<RecordLineIcon />}
      />
      {/* 视频对讲：开 = 把本机摄像头画面送到门口屏。按下即亮，不论成功与否；再按一次取消 */}
      <LiveTool
        label={t('face3.videoCall')}
        active={videoCallOn}
        disabled={disabled || !videoCallReady}
        onClick={onVideoCall}
        icon={<VideoCallLineIcon />}
      />
    </Box>
  );
}

/**
 * AI 开关：固定在工具栏第一格，不随实时 / 录像切换。
 * 开着是主题色，关着是普通色（与其他工具的"按下 / 开着"一致）。
 */
export function Face3AiTool({ on = false, pending = false, stopping = false, onToggle }) {
  const { t } = useTranslation();
  return (
    <LiveTool
      label={t(stopping ? 'face3.ai.stopping' : pending ? 'face3.ai.updating' : 'face3.ai.label')}
      active={on}
      disabled={pending || stopping}
      onClick={onToggle}
      icon={<AiBotLineIcon />}
      labelEnd={<MiniSwitch on={on} />}
    />
  );
}

/**
 * 录像工具栏：选中一条录像时替换实时工具栏。
 *   下载 —— 播放地址取到后可用，下载中亮起
 *   删除 —— 访客（只能看）置灰；按下先确认，删除中亮起
 * 分享还没定怎么做，先不放按钮。
 */
export function Face3RecordingToolbar({
  canDownload = false,
  downloading = false,
  onDownload,
  canDelete = false,
  deleting = false,
  onDelete,
}) {
  const { t } = useTranslation();
  return (
    <Box sx={toolbarSx}>
      <LiveTool
        label={t('face3.recordings.download')}
        active={downloading}
        disabled={!canDownload}
        onClick={onDownload}
        icon={<DownloadLineIcon />}
      />
      <LiveTool
        label={t('face3.recordings.delete')}
        active={deleting}
        disabled={!canDelete}
        onClick={onDelete}
        icon={<DeleteLineIcon />}
      />
    </Box>
  );
}
