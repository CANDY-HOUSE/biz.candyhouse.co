import React from 'react';
import { SvgIcon } from '@mui/material';

/**
 * 详情页实时画面下方工具的图标：细线描边风格（圆角、无填充）。
 * MUI 自带的 Outlined 图标镜头三角等部位仍是实心的，与设计参考不符，这里自绘。
 * 颜色跟随 currentColor（录制中变红等由外层控制）。
 */
const LineIcon = ({ children, ...props }) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  </SvgIcon>
);

/** 拍照：相机 */
export const SnapshotLineIcon = (props) => (
  <LineIcon {...props}>
    <path d="M4.5 7.5h2.8l1.5-2h6.4l1.5 2h2.8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V9a1.5 1.5 0 0 1 1.5-1.5z" />
    <circle cx="12" cy="13" r="3.25" />
  </LineIcon>
);

/** 录制：摄像机（机身 + 镜头） */
export const RecordLineIcon = (props) => (
  <LineIcon {...props}>
    <rect x="3" y="6.5" width="12.5" height="11" rx="2" />
    <path d="M15.5 10.5l4.7-2.7a.5.5 0 0 1 .8.43v7.54a.5.5 0 0 1-.8.43l-4.7-2.7" />
  </LineIcon>
);

/** AI：数字机器人头像（天线、圆角头、两侧耳朵、竖线眼睛、一字嘴） */
export const AiBotLineIcon = (props) => (
  <LineIcon {...props}>
    <circle cx="12" cy="2.75" r="1" />
    <path d="M12 3.75V6" />
    <rect x="4.5" y="6" width="15" height="12.5" rx="3.5" />
    <path d="M2.5 10.75v3.5M21.5 10.75v3.5" />
    <path d="M9.25 10.5v2M14.75 10.5v2M10 15.25h4" />
  </LineIcon>
);

/** 下载：向下箭头 + 托盘 */
export const DownloadLineIcon = (props) => (
  <LineIcon {...props}>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
    <path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
  </LineIcon>
);

/** 删除：垃圾桶 */
export const DeleteLineIcon = (props) => (
  <LineIcon {...props}>
    <path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19l1-12M10 11v6M14 11v6" />
  </LineIcon>
);

/** 分享：方框 + 向上箭头 */
export const ShareLineIcon = (props) => (
  <LineIcon {...props}>
    <path d="M12 3.5v11M8 7.5l4-4 4 4" />
    <path d="M8.5 10.5h-2A1.5 1.5 0 0 0 5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7a1.5 1.5 0 0 0-1.5-1.5h-2" />
  </LineIcon>
);

/** 视频对讲：摄像机 + 右上角加号（把本机画面也送过去）。摄像机整体下移，给加号腾出位置 */
export const VideoCallLineIcon = (props) => (
  <LineIcon {...props}>
    <rect x="3" y="8" width="12.5" height="11" rx="2" />
    <path d="M15.5 12l4.7-2.7a.5.5 0 0 1 .8.43v7.54a.5.5 0 0 1-.8.43l-4.7-2.7" />
    <path d="M19.5 1.75v4.5M17.25 4h4.5" />
  </LineIcon>
);
