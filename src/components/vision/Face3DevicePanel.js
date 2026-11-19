import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';
import { logOperationFailure } from '@/services/operationFailure';
import Face3RecordingPlayer from './Face3RecordingPlayer';
import { Face3AiTool, Face3LiveToolbar, Face3RecordingToolbar } from './Face3Toolbar';
import { canSaveMedia, mediaFileName, saveMedia } from './face3Snapshot';
import { Face3LiveSlot, useFace3LiveSession } from './face3LiveSession';
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
 * 「观看实时画面」胶囊按钮，放在事件录像标题行的右侧（参考 Wyze 的「ライブを見る」）。
 * 正在看实时时隐藏 —— 画面左上角已有 LIVE；离线时置灰，写"离线 · 多久以前"。
 */
function LiveButton({ online, lastSeenAt, onClick }) {
  const { t } = useTranslation();
  const rel = useRelativeTime();
  return (
    <Button
      variant="contained"
      disableElevation
      disabled={!online}
      onClick={onClick}
      size="small"
      startIcon={<SensorsRoundedIcon sx={{ fontSize: '20px !important' }} />}
      sx={{
        flexShrink: 0,
        borderRadius: 999,
        px: 2,
        py: 0.75,
        fontSize: 14,
        fontWeight: 700,
        color: 'common.white',
        '&.Mui-disabled': { bgcolor: 'grey.200', color: 'text.disabled' },
      }}
    >
      {online
        ? t('face3.watchLive')
        : lastSeenAt > 0
          ? `${t('face3.offline')} · ${rel(lastSeenAt)}`
          : t('face3.offline')}
    </Button>
  );
}

/**
 * Face3 的录像卡片，放在设备详情页（/biz/access-control/region）里，只有 Face3 才显示。
 * 交互参考 Wyze：上面是画面框 + 工具栏，下面是事件录像（宽屏左右平分：左画面 + 工具栏，右录像）。
 * PC 在详情页最上面，手机上是详情页默认显示的内容，设置走页头 ⋯（见 region.js）。
 *
 *   - 点一张录像卡片，画面框就播它（卡片主题色描边）；再点一次取消选中，回到默认
 *   - 事件录像标题行右侧是「观看实时画面」胶囊按钮，点了画面框切到实时；看实时时按钮隐藏
 *   - 画面框标明正在看的内容：实时是正上方小号无底色的"● LIVE"，录像是左上角"录像 · 时间"
 *   - 什么都没播时画面框只显示 Vision logo
 *   - 画面下方工具栏：第一格 AI 开关；后三格实时是拍照 / 录制 / 视频对讲，选中录像是下载 / 删除 / 分享
 * 实时与录像互斥；实时的协议按本机 AI 开关选（与 Vision 首页一致）。
 * 不自动开实时：开实时要唤醒设备（耗电、计费），等用户点。
 */
export default function Face3DevicePanel({ deviceUUID: rawDeviceUUID, deviceName = '', keyLevel }) {
  const { t, i18n } = useTranslation();
  const { gFace3, setSnackbarValue } = useContext(GlobalStateContext);
  const { listFace3Devices, deleteFace3Recording } = gFace3;
  const { isAiOn, toggleAi } = useFace3Ai();
  const deviceUUID = (rawDeviceUUID || '').toUpperCase();
  const face3Devices = gFace3.face3Devices || [];
  /* 录像按 Face3 的绑定关系鉴权，列表里还没有这台时先用详情页传来的编号和名称 */
  const device = deviceUUID
    ? face3Devices.find((d) => (d.deviceUUID || '').toUpperCase() === deviceUUID) || { deviceUUID, deviceName }
    : null;

  const playback = useRecordingPlayback(device?.deviceUUID);
  /* 实时画面是全局会话（见 face3LiveSession）：在 Vision 首页看着点进来，连接不断、直接接着看 */
  const liveSession = useFace3LiveSession();
  const live = Boolean(deviceUUID) && liveSession.liveUUID === deviceUUID;
  /* 画面以外的工具（拍照、录制、视频对讲）由 Face3LiveView 渲染进这个节点，放在画面正下方；
     话筒、扬声器叠在画面底部正中 */
  const [toolsEl, setToolsEl] = useState(null);
  const { setToolsTarget } = liveSession;
  useEffect(() => {
    if (!toolsEl) return undefined;
    setToolsTarget(toolsEl);
    return () => setToolsTarget((current) => (current === toolsEl ? null : current));
  }, [toolsEl, setToolsTarget]);
  /* 在线状态来自 Face3 列表；列表里还没有这台时当作离线，不给开实时 */
  const online = device?.stateInfo?.wm2State === true;
  const lastSeenAt = Number(device?.stateInfo?.lastSeenAt) || 0;
  const startLive = () => {
    playback.stop();
    liveSession.start(device, selectFace3Protocol({ aiEnabled: isAiOn(device.deviceUUID) }));
  };
  const stopLive = () => {
    if (live) liveSession.stop();
  };
  /* AI 开关（工具栏第一格）：看着实时切换时按新协议重连（KVS ↔ LiveKit）；未登录开启会被拦下，不重连 */
  const toggleAiTool = () => {
    const next = !isAiOn(device.deviceUUID);
    if (toggleAi(device, next) && live) liveSession.setProtocol(selectFace3Protocol({ aiEnabled: next }));
  };

  /* 点一条录像：在画面框里播放；再点一次正在看的那条就取消选中，回到默认（Vision logo + 灰色实时工具栏） */
  const playRecording = (item) => {
    if (playback.selected?.recId === item.recId) {
      playback.stop();
      return;
    }
    stopLive();
    playback.play(item);
  };

  /* 选中录像时的工具栏：下载、删除（分享暂未实现）。
     拍照、录制的失败提示同理：全局提示条不显示 error 级，用 warning 并另记诊断日志。 */
  const notify = (severity, key) => setSnackbarValue({ open: true, severity, msg: t(key) });
  const notifyFailure = (action, reason, key) => {
    logOperationFailure(`components/vision/Face3DevicePanel.${action}`, reason);
    notify('warning', key);
  };
  /* 访客（keyLevel 2）只能看不能删；拿不到级别时交给云端判断 */
  const canDelete = keyLevel === undefined || keyLevel === null || keyLevel === '' || Number(keyLevel) <= 1;
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removedRecIds, setRemovedRecIds] = useState(() => new Set());

  /* 下载：用播放地址把视频取回来，再按环境保存（PC 下载 / 手机分享面板 / APP 需壳支持，同实时录制）。
     S3 桶允许跨域 GET，所以前端能直接取。声音是旁路 .wav（见 Face3RecordingPlayer），下载的 MP4 不带声音。 */
  const downloadRecording = async () => {
    const item = playback.selected;
    const url = playback.media?.mp4;
    if (!item || !url || downloading) return;
    if (!canSaveMedia('video')) {
      notify('info', 'face3.recordSaveUnsupported');
      return;
    }
    setDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`http_${response.status}`);
      const blob = new Blob([await response.blob()], { type: 'video/mp4' });
      const name = mediaFileName(device?.deviceName || deviceUUID, 'mp4', new Date(recordingTime(item)));
      const result = await saveMedia(blob, name, 'video');
      if (result !== 'shared')
        notify('success', result === 'downloaded' ? 'face3.recordDownloaded' : 'face3.recordSaved');
    } catch (err) {
      if (err?.name !== 'AbortError')
        notifyFailure('download', err?.name || err?.message, 'face3.recordings.downloadFailed');
    } finally {
      setDownloading(false);
    }
  };

  /* 删除：先确认；成功后从列表隐去这条，并回到默认状态 */
  const deleteRecording = async () => {
    const item = playback.selected;
    if (!item || deleting) return;
    setDeleting(true);
    const response = await deleteFace3Recording(deviceUUID, item.recId);
    setDeleting(false);
    setConfirmDelete(false);
    if (!response.success) {
      if (response.message === 'no_permission') notify('warning', 'face3.recordings.deleteNoPermission');
      else notifyFailure('delete', response.message, 'face3.recordings.deleteFailed');
      return;
    }
    setRemovedRecIds((old) => new Set(old).add(item.recId));
    playback.stop(); // 确认框是模态的，删除期间选不了别的录像
    notify('success', 'face3.recordings.deleted');
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
    if (live) return <Face3LiveSlot />;
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
      {/* 宽屏左右平分：左边画面框，下面是工具栏；右边是事件录像列表。
          窄屏上下排：画面框、工具栏、事件录像。
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
          {/* 工具栏一行四格：第一格是 AI 开关（任何时候都能点），
              后三格随画面框换（实时：拍照、录制、视频对讲；选中录像：下载、删除、分享）。
              后三格：看实时时由 Face3LiveView 用 portal 渲染进 toolsEl，出画后可用；
              没在看实时时这里放一份（选中录像是录像工具，否则是灰色不可点的实时工具） */}
          <Box sx={{ display: 'flex', bgcolor: 'background.paper' }}>
            {device && <Face3AiTool on={isAiOn(device.deviceUUID)} onToggle={toggleAiTool} />}
            <Box sx={{ flex: 3, minWidth: 0 }}>
              <Box ref={setToolsEl} />
              {device &&
                !live &&
                (playback.selected ? (
                  <Face3RecordingToolbar
                    canDownload={Boolean(playback.media?.mp4)}
                    downloading={downloading}
                    onDownload={downloadRecording}
                    canDelete={canDelete}
                    deleting={deleting || confirmDelete}
                    onDelete={() => setConfirmDelete(true)}
                  />
                ) : (
                  <Face3LiveToolbar disabled />
                ))}
            </Box>
          </Box>
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
                removedRecIds={removedRecIds}
                headerAction={!live && <LiveButton online={online} lastSeenAt={lastSeenAt} onClick={startLive} />}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* 删除录像前确认：删了云端就没有了 */}
      <Dialog open={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('face3.recordings.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {playback.selected ? recordingLabel(playback.selected) : ''}
            {' · '}
            {t('face3.recordings.deleteConfirmText')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={deleting} onClick={() => setConfirmDelete(false)}>
            {t('face3.cancel')}
          </Button>
          <Button color="error" variant="contained" disableElevation disabled={deleting} onClick={deleteRecording}>
            {deleting ? <CircularProgress size={18} color="inherit" /> : t('face3.recordings.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
