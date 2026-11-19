import React, { useRef } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  AiBotLineIcon,
  DeleteLineIcon,
  DownloadLineIcon,
  RecordLineIcon,
  ShareLineIcon,
  SnapshotLineIcon,
  VideoCallLineIcon,
} from './face3ToolIcons';

/* 同一个工具两次按下间隔不到这么久，后一次不算（防连点：开始录制马上又停、对讲开了又关） */
const TOOL_PRESS_GAP_MS = 1000;

/** 录制计时 mm:ss（工具文字和画面上的 REC 共用） */
export const formatElapsed = (ms) => {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

/** 一个工具：图标在上、文字在下（参考 Wyze）；按下 / 开着时图标和文字都是主题色，不可用时灰色 */
const LiveTool = ({ icon, label, ariaLabel = label, active, disabled, onClick, labelEnd }) => {
  const lastPressRef = useRef(0);
  const handleClick = (event) => {
    const now = Date.now();
    if (now - lastPressRef.current < TOOL_PRESS_GAP_MS) return;
    lastPressRef.current = now;
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
 * 详情页画面正下方的工具栏。同一位置按画面框里放的内容换：
 *   实时（及什么都没放）—— Face3LiveToolbar：拍照、录制、视频对讲
 *   选中了一条录像        —— Face3RecordingToolbar：下载、删除、分享
 */

/**
 * 实时工具栏：拍照、录制、视频对讲。
 *   没在看实时（或还没出画）时三个都是灰色、不可点（disabled，详情页自己渲染这一份）；
 *   出画后由 Face3LiveView 渲染可用的那一份（经 portal 放到同一位置），带上各工具的状态和回调。
 */
export function Face3LiveToolbar({
  disabled = false,
  snapshotBusy = false,
  onSnapshot,
  recording = false,
  recordElapsedMs = 0,
  recordSaving = false,
  onRecord,
  videoCallOn = false,
  videoCallReady = true,
  onVideoCall,
}) {
  const { t } = useTranslation();
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
        label={recording ? formatElapsed(recordElapsedMs) : t('face3.record')}
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
 * AI 开关：固定在工具栏第一格，不随实时 / 录像切换，任何时候都能点。
 * 开着是主题色，关着是普通色（与其他工具的"按下 / 开着"一致）。
 */
export function Face3AiTool({ on = false, onToggle }) {
  const { t } = useTranslation();
  return (
    <LiveTool
      label={t('face3.ai.label')}
      active={on}
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
 *   分享 —— 暂未实现，始终置灰
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
      <LiveTool label={t('face3.recordings.share')} disabled icon={<ShareLineIcon />} />
    </Box>
  );
}
