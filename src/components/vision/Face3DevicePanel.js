import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';
import Face3RecordingPlayer from './Face3RecordingPlayer';
import Face3EventRecordings, { recordingErrorKey, recordingTime } from './Face3EventRecordings';
import Face3BioMigrate from './Face3BioMigrate';
import { useFace3Ai } from './face3AiPref';

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
 * Face3 的录像卡片，放在设备详情页（/biz/access-control/region）里，只有 Face3 才显示。
 * 宽屏时录像列表在左、播放区在右（只占一小部分）且 AI / 迁移在播放区下面，窄屏播放区在上；
 * PC 在详情页电池电量之上，手机上是详情页默认显示的内容，设置走页头 ⋯（见 region.js）。
 *
 * 16:9 播放区只放录像：从列表点一条才播放，没选时只显示占位。
 * 实时画面只在 Vision 首页看，这里不提供。
 */
export default function Face3DevicePanel({ deviceUUID: rawDeviceUUID, deviceName = '' }) {
  const { t, i18n } = useTranslation();
  const { gFace3 } = useContext(GlobalStateContext);
  const { listFace3Devices } = gFace3;
  const { isAiOn, toggleAi } = useFace3Ai();
  const deviceUUID = (rawDeviceUUID || '').toUpperCase();
  const face3Devices = gFace3.face3Devices || [];
  /* 录像、迁移按 Face3 的绑定关系鉴权，列表里还没有这台时先用设置页传来的编号和名称 */
  const device = deviceUUID
    ? face3Devices.find((d) => (d.deviceUUID || '').toUpperCase() === deviceUUID) || { deviceUUID, deviceName }
    : null;

  const [migrateOpen, setMigrateOpen] = useState(false);
  const playback = useRecordingPlayback(device?.deviceUUID);

  /* 进来时刷新一次 Face3 列表：直接打开设置页（刷新、推送冷启动）时列表可能还没有，迁移要用到它。
     listFace3Devices 跨渲染稳定，见 Face3DeviceList 的说明。 */
  useEffect(() => {
    listFace3Devices(() => {});
  }, [listFace3Devices]);

  const openMigrate = () => {
    playback.stop();
    setMigrateOpen(true);
  };

  const recordingLabel = (item) =>
    new Date(recordingTime(item)).toLocaleString(i18n.language, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const renderFrame = () => {
    if (!device) return null;
    if (playback.selected) {
      if (playback.media) {
        return (
          <Face3RecordingPlayer
            key={playback.selected.recId}
            media={playback.media}
            label={recordingLabel(playback.selected)}
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
    /* 没选录像：只显示占位，从下方列表点一条才播放 */
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
    <Box sx={{ bgcolor: 'background.paper' }}>
      {/* 宽屏：左边录像列表；右边播放区（只占一小部分），AI / 迁移放在播放区下面。
          窄屏上下排：播放区、AI / 迁移、录像列表 */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'flex-start' },
          columnGap: 3,
          px: { xs: 0, md: 2 },
          py: { xs: 0, md: 2 },
        }}
      >
        <Box
          sx={{
            order: { xs: 0, md: 1 },
            flex: { xs: 'none', md: '0 0 45%' },
            maxWidth: { md: 680 },
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
              <Divider orientation="vertical" flexItem sx={{ my: 1.75 }} />
              <ButtonBase
                onClick={openMigrate}
                sx={{ flex: 1.5, justifyContent: 'space-between', gap: 0.5, pl: 2, pr: 1, fontSize: 15 }}
              >
                <Typography component="span" sx={{ whiteSpace: 'nowrap' }}>
                  {t('face3.migrate.entry')}
                </Typography>
                <KeyboardArrowRightIcon sx={{ color: 'text.disabled' }} />
              </ButtonBase>
            </Box>
          )}
        </Box>

        {device && (
          <Box sx={{ order: { xs: 1, md: 0 }, flex: 1, minWidth: 0 }}>
            <Face3EventRecordings
              key={device.deviceUUID}
              device={device}
              selectedRecId={playback.selected?.recId}
              onSelect={playback.play}
            />
          </Box>
        )}
      </Box>

      {migrateOpen && device && (
        <Face3BioMigrate
          key={device.deviceUUID}
          device={device}
          devices={face3Devices}
          onClose={() => setMigrateOpen(false)}
        />
      )}
    </Box>
  );
}
