import React, { useContext, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, FormControlLabel, ListItemButton, Switch, Typography } from '@mui/material';
import OndemandVideoRoundedIcon from '@mui/icons-material/OndemandVideoRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';
import Face3RecordingPlayer from './Face3RecordingPlayer';
import Face3LiveView from './Face3LiveView';
import { selectFace3Protocol } from './protocols';
import Face3EventRecordings, { recordingErrorKey, recordingTime } from './Face3EventRecordings';
import { useFace3Ai } from './face3AiPref';
import { useRelativeTime } from './face3RelativeTime';

/**
 * 选中录像后的播放请求（原先在录像弹窗里，逻辑不变）：取播放地址、记录错误、
 * 换一条时作废上一条的请求。
 */
function useRecordingPlayback(deviceId) {
  const { gFace3 } = useContext(GlobalStateContext);
  const { playFace3Recording } = gFace3;
  const [selected, setSelected] = useState(null);
  const [media, setMedia] = useState(null);
  const [playLoading, setPlayLoading] = useState(false);
  const [playError, setPlayError] = useState('');
  const playGeneration = useRef(0);
  const playAbort = useRef(null);

  useEffect(
    () => () => {
      playGeneration.current++;
      playAbort.current?.abort();
    },
    []
  );

  const play = async (item) => {
    const generation = ++playGeneration.current;
    setSelected(item);
    setMedia(null);
    setPlayError('');
    setPlayLoading(true);
    playAbort.current?.abort();
    playAbort.current = new AbortController();
    const response = await playFace3Recording(deviceId, item.recId, playAbort.current.signal);
    if (generation !== playGeneration.current) return;
    setPlayLoading(false);
    if (!response.success || !response.data?.mp4 || response.data.recId !== item.recId) {
      setPlayError(recordingErrorKey(response.message, true));
      return;
    }
    setMedia(response.data);
  };

  const stop = () => {
    playGeneration.current++;
    playAbort.current?.abort();
    setSelected(null);
    setMedia(null);
    setPlayError('');
    setPlayLoading(false);
  };

  return { selected, media, playLoading, playError, play, stop };
}

/**
 * 播放区下面的「实时画面」卡片按钮：圆角、无边框，靠柔和阴影浮起来，一眼看出能点；按下时微微缩一下，背景不变色。
 * 左边图标，中间标题 + 一行说明：在线"查看当下门口的画面"，离线"离线 · 多久以前"（置灰、阴影变淡、不可点）。
 * 对方画面真正显示出来后（不含唤醒、连接中）行尾写"直播中"，与图标同色。
 */
function LiveRow({ online, live, playing, lastSeenAt, onSelect }) {
  const { t } = useTranslation();
  const rel = useRelativeTime();
  const status =
    online || live
      ? t('face3.liveViewHint')
      : lastSeenAt > 0
        ? `${t('face3.offline')} · ${rel(lastSeenAt)}`
        : t('face3.offline');
  return (
    <ListItemButton
      selected={live}
      aria-current={live || undefined}
      disabled={!online && !live}
      onClick={() => !live && onSelect()}
      sx={{
        gap: 1.5,
        mt: 1.5,
        mx: { xs: 2, md: 0 },
        px: 2,
        py: 1.25,
        borderRadius: 2,
        /* 不用边框：白底 + 柔和阴影，像参考图里浮在页面上的卡片 */
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        transition: 'transform 120ms ease',
        '&:active': { transform: 'scale(0.98)' },
        '&.Mui-disabled': { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' },
        /* 选中只靠行尾"直播中"表达，背景不变色 */
        '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'transparent' },
      }}
    >
      <OndemandVideoRoundedIcon sx={{ fontSize: 24, color: 'primary.main', flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'common.black' }}>{t('face3.liveView')}</Typography>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {status}
        </Typography>
      </Box>
      {playing && (
        // 与左边图标同色
        <Typography variant="caption" sx={{ flexShrink: 0, color: 'primary.main', fontWeight: 500 }}>
          {t('face3.live')}
        </Typography>
      )}
    </ListItemButton>
  );
}

/**
 * Face3 的录像卡片，放在设备详情页（/biz/access-control/region）里，只有 Face3 才显示。
 * 宽屏左右平分：左边是播放区，下面依次是「实时画面」、AI 开关；右边是事件录像列表。窄屏上下排；
 * PC 在详情页最上面，手机上是详情页默认显示的内容，设置走页头 ⋯（见 region.js）。
 *
 * 交互只有一种：点哪一行，画面框就播哪一个 ——
 *   - 播放区正下方是「实时画面」（在线才可点），右边是事件录像；选中后行尾写"直播中 / 播放中"（背景不变色）
 *   - 画面框左上角标明正在看的内容：实时是小号无底色的"● LIVE"，录像是"录像 · 时间"
 *   - 什么都没播时画面框只显示 Vision logo
 * 实时与录像互斥；实时的协议按本机 AI 开关选（与 Vision 首页一致）。
 * 不自动开实时：开实时要唤醒设备（耗电、计费），等用户点。
 */
export default function Face3DevicePanel({ deviceUUID: rawDeviceUUID, deviceName = '' }) {
  const { t, i18n } = useTranslation();
  const { gFace3 } = useContext(GlobalStateContext);
  const { listFace3Devices } = gFace3;
  const { isAiOn, toggleAi } = useFace3Ai();
  const deviceUUID = (rawDeviceUUID || '').toUpperCase();
  const face3Devices = gFace3.face3Devices || [];
  /* 录像按 Face3 的绑定关系鉴权，列表里还没有这台时先用详情页传来的编号和名称 */
  const device = deviceUUID
    ? face3Devices.find((d) => (d.deviceUUID || '').toUpperCase() === deviceUUID) || { deviceUUID, deviceName }
    : null;

  const playback = useRecordingPlayback(device?.deviceUUID);
  const [live, setLive] = useState(false);
  /* 实时画面是否已出画：按下后要等唤醒、连接，真正有画面才提示"直播中" */
  const [livePlaying, setLivePlaying] = useState(false);
  /* 在线状态来自 Face3 列表；列表里还没有这台时当作离线，不给开实时 */
  const online = device?.stateInfo?.wm2State === true;
  const lastSeenAt = Number(device?.stateInfo?.lastSeenAt) || 0;
  const startLive = () => {
    playback.stop();
    setLivePlaying(false);
    setLive(true);
  };
  const stopLive = () => {
    setLive(false);
    setLivePlaying(false);
  };
  const playRecording = (item) => {
    stopLive();
    playback.play(item);
  };

  /* 进来时刷新一次 Face3 列表：直接打开详情页（刷新、推送冷启动）时列表可能还没有这台。
     listFace3Devices 跨渲染稳定，见 Face3DeviceList 的说明。 */
  useEffect(() => {
    listFace3Devices(() => {});
  }, [listFace3Devices]);

  const recordingLabel = (item) =>
    new Date(recordingTime(item)).toLocaleString(i18n.language, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const renderFrame = () => {
    if (!device) return null;
    if (live) {
      return (
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <Face3LiveView
            device={device}
            protocol={selectFace3Protocol({ aiEnabled: isAiOn(device.deviceUUID) })}
            onClose={stopLive}
            onPlayingChange={setLivePlaying}
            label="LIVE"
          />
        </Box>
      );
    }
    if (playback.selected) {
      if (playback.media) {
        return (
          <Face3RecordingPlayer
            key={playback.selected.recId}
            media={playback.media}
            label={`${t('face3.recordings.tag')} · ${recordingLabel(playback.selected)}`}
            onRetry={() => playback.play(playback.selected)}
            onEnded={playback.stop}
          />
        );
      }
      return (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            px: 3,
            textAlign: 'center',
          }}
        >
          {playback.playError ? (
            <>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {t(playback.playError)}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => playback.play(playback.selected)}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                {t('face3.retry')}
              </Button>
            </>
          ) : (
            <CircularProgress size={28} aria-label={t('face3.recordings.loading')} />
          )}
        </Box>
      );
    }
    /* 什么都没播：只显示 Vision logo，点下面的「实时画面」或右边的一条录像 */
    return (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.28)',
        }}
      >
        <VisionIcon width={56} height={56} />
      </Box>
    );
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', height: { xs: '100%', md: 'auto' } }}>
      {/* 宽屏左右平分：左边播放区，下面是「实时画面」和 AI 开关；右边是事件录像列表。
          窄屏上下排：播放区、实时画面、AI 开关、事件录像。
          录像列表有总高度、在自己里面滚动，不会把页面无限往下撑：
            宽屏 —— 与左栏同高（右栏内容绝对定位，行高只由左栏决定）
            窄屏 —— 占满详情页剩下的高度（至少 240px） */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'stretch',
          columnGap: 3,
          px: { xs: 0, md: 2 },
          py: { xs: 0, md: 2 },
          height: { xs: '100%', md: 'auto' },
        }}
      >
        <Box
          sx={{
            flex: { xs: 'none', md: '1 1 0' },
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              aspectRatio: '16 / 9',
              bgcolor: '#2A2A2E',
              overflow: 'hidden',
            }}
          >
            {renderFrame()}
          </Box>
          {device && (
            <LiveRow
              online={online}
              live={live}
              playing={live && livePlaying}
              lastSeenAt={lastSeenAt}
              onSelect={startLive}
            />
          )}
          {device && (
            <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: 52 }}>
              <FormControlLabel
                labelPlacement="start"
                label={t('face3.ai.label')}
                control={
                  <Switch
                    checked={isAiOn(device.deviceUUID)}
                    onChange={(event) => toggleAi(device, event.target.checked)}
                  />
                }
                sx={{ flex: 1, m: 0, pl: 2, pr: 1, justifyContent: 'space-between' }}
              />
            </Box>
          )}
        </Box>

        {device && (
          <Box
            sx={{
              flex: { xs: '1 1 auto', md: '1 1 0' },
              minWidth: 0,
              minHeight: { xs: 240, md: 0 },
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                position: { md: 'absolute' },
                inset: { md: 0 },
              }}
            >
              <Face3EventRecordings
                key={device.deviceUUID}
                device={device}
                selectedRecId={playback.selected?.recId}
                onSelect={playRecording}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
