import React, { useEffect, useRef, useState } from 'react';
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
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';
import { logOperationFailure } from '@/services/operationFailure';
import Face3RecordingPlayer from './Face3RecordingPlayer';
import { Face3AiTool, Face3LiveToolbar, Face3RecordingToolbar } from './Face3Toolbar';
import { Face3LiveSlot, useFace3Context } from './face3Context';
import { selectFace3Protocol } from './protocols';
import Face3EventRecordings, { recordingErrorKey, recordingTime } from './Face3EventRecordings';
import { canSaveMedia, mediaFileName, relativeTime, saveMedia } from './face3Utils';

const NO_PLAYBACK = { selected: null, media: null, playError: '' };

/**
 * 选中录像后的播放请求：取播放地址、记录错误、换一条时作废上一条的请求。
 * selected 选中的录像；media 取回的播放地址；playError 取地址失败的文案键
 * （选中了、media 和 playError 都还没有 = 正在取）。三者一起变，放一个 state。
 */
function useRecordingPlayback(deviceId, playFace3Recording) {
  const [playback, setPlayback] = useState(NO_PLAYBACK);
  const requestRef = useRef({ generation: 0, abort: null });

  useEffect(() => {
    const request = requestRef.current;
    return () => {
      request.generation++;
      request.abort?.abort();
    };
  }, []);

  const play = async (item) => {
    const request = requestRef.current;
    const generation = ++request.generation;
    setPlayback({ ...NO_PLAYBACK, selected: item });
    request.abort?.abort();
    request.abort = new AbortController();
    const response = await playFace3Recording(deviceId, item.recId, request.abort.signal);
    if (generation !== request.generation) return;
    if (!response.success || !response.data?.mp4 || response.data.recId !== item.recId) {
      setPlayback((current) => ({ ...current, playError: recordingErrorKey(response.message, true) }));
      return;
    }
    setPlayback((current) => ({ ...current, media: response.data }));
  };

  const stop = () => {
    requestRef.current.generation++;
    requestRef.current.abort?.abort();
    setPlayback(NO_PLAYBACK);
  };

  return { ...playback, play, stop };
}

/**
 * 「观看实时画面」胶囊按钮，放在事件录像标题行的右侧（参考 Wyze 的「ライブを見る」）。
 * 正在看实时时隐藏 —— 画面左上角已有 LIVE；离线时置灰，写"离线 · 多久以前"。
 */
/**
 * 点「观看实时画面」后的等待计时，精确到毫秒，外形与 LiveButton 一致、占同一位置。
 * result 为空：出画前，每帧刷新；result = { ms, ok }：首次出画（ok）或出错后定格显示。
 */
function LiveWaitBadge({ startedAt, result }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => performance.now());
  const frozen = Boolean(result);
  useEffect(() => {
    if (frozen) return undefined;
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frozen]);
  const ms = frozen ? result.ms : Math.max(0, now - startedAt);
  const seconds = (ms / 1000).toFixed(3);
  let text = `${t('face3.waitingLive')} ${seconds} s`;
  if (frozen) text = result.ok ? `${t('face3.wakeTook')} ${seconds} s` : `${t('face3.wakeFailedAfter')} · ${seconds} s`;
  return (
    <Box
      role={frozen ? 'status' : 'timer'}
      aria-label={text}
      sx={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        borderRadius: 999,
        px: 2,
        py: 0.75,
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1.75,
        bgcolor: 'grey.200',
        color: frozen && !result.ok ? 'warning.dark' : 'text.secondary',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {!frozen && <CircularProgress size={14} thickness={6} color="inherit" />}
      {text}
    </Box>
  );
}

function LiveButton({ online, lastSeenAt, onClick }) {
  const { t } = useTranslation();
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
          ? `${t('face3.offline')} · ${relativeTime(t, lastSeenAt)}`
          : t('face3.offline')}
    </Button>
  );
}

/**
 * Face3 的录像卡片，放在设备详情页里，只有 Face3 才显示。
 * 交互参考 Wyze：上面是画面框 + 工具栏，下面是事件录像（宽屏左右平分：左画面 + 工具栏，右录像）。
 * PC 在详情页最上面，手机上是详情页默认显示的内容，设置走页头 ⋯（见 region.js）。
 *
 *   - 点一张录像卡片，画面框就播它（卡片主题色描边）；再点一次取消选中，回到默认
 *   - 事件录像标题行右侧是「观看实时画面」胶囊按钮，点了画面框切到实时；看实时时按钮隐藏
 *   - 画面框标明正在看的内容：实时是正上方小号无底色的"● LIVE"，录像是左上角"录像 · 时间"
 *   - 什么都没播时画面框只显示 Vision logo
 *   - 画面下方工具栏：第一格 AI 开关；实时后跟拍照 / 录制 / 视频对讲，选中录像后跟下载 / 删除（三格居中）
 * 实时与录像互斥；共享 AI 会话使用 LiveKit。
 * 不自动开实时：开实时要唤醒设备（耗电、计费），等用户点。
 *
 * 数据从 useFace3Context() 取（不订阅全局 GlobalStateContext），再用 memo 包住（见文件末尾）：
 * props 都是字符串，父页面因全局状态重渲时这里不跟着重渲，只在 Face3 自己的数据变了才重渲。
 */
function Face3DevicePanel({ deviceUUID: rawDeviceUUID, deviceName = '', keyLevel, fill = false }) {
  const { t, i18n } = useTranslation();
  const face3 = useFace3Context();
  const {
    devices,
    isAiOn,
    toggleAi,
    watchAiDevice,
    aiSessions,
    aiPending,
    liveUUID,
    liveStartedAt,
    liveWait,
    setToolsTarget,
    notify: setSnackbarValue,
  } = face3;
  const deviceUUID = (rawDeviceUUID || '').toUpperCase();
  useEffect(() => {
    watchAiDevice(deviceUUID);
    return () => watchAiDevice('');
  }, [deviceUUID, watchAiDevice]);
  /* 录像按 Face3 的绑定关系鉴权，列表里还没有这台时先用详情页传来的编号和名称 */
  const device = deviceUUID
    ? devices.find((d) => (d.deviceUUID || '').toUpperCase() === deviceUUID) || { deviceUUID, deviceName }
    : null;

  const playback = useRecordingPlayback(device?.deviceUUID, face3.playFace3Recording);
  /* 实时画面是 Face3Provider 里的会话：在 Vision 首页看着点进来，连接不断、直接接着看。
     画面以外的工具（拍照、录制、视频对讲）由 Face3LiveView 渲染进工具栏里的一个节点：
     把 setToolsTarget 直接当 ref 用，挂上时登记、卸下时清空（同一时刻只有一个详情页）。
     话筒、扬声器叠在画面底部正中 */
  const live = Boolean(deviceUUID) && liveUUID === deviceUUID;
  /* 在线状态来自 Face3 列表；列表里还没有这台时当作离线，不给开实时 */
  const online = device?.stateInfo?.wm2State === true;
  const lastSeenAt = Number(device?.stateInfo?.lastSeenAt) || 0;
  const startLive = () => {
    playback.stop();
    face3.start(device, selectFace3Protocol({ aiEnabled: isAiOn(device.deviceUUID) }));
  };
  const stopLive = () => {
    if (live) face3.stop();
  };
  const aiStopping = aiSessions[deviceUUID]?.state === 'STOPPING';

  /* 点一条录像：在画面框里播放；再点一次正在看的那条就取消选中，回到默认（Vision logo + 灰色实时工具栏） */
  const playRecording = (item) => {
    if (playback.selected?.recId === item.recId) {
      playback.stop();
      return;
    }
    stopLive();
    playback.play(item);
  };

  /* 选中录像时的工具栏：下载、删除。
     拍照、录制的失败提示同理：全局提示条不显示 error 级，用 warning 并另记诊断日志。 */
  const notify = (severity, key) => setSnackbarValue({ open: true, severity, msg: t(key) });
  const notifyFailure = (action, reason, key) => {
    logOperationFailure(`components/vision/Face3DevicePanel.${action}`, reason);
    notify('warning', key);
  };
  /* 访客（keyLevel 2）只能看不能删；拿不到级别时交给云端判断 */
  const canDelete = keyLevel === undefined || keyLevel === null || keyLevel === '' || Number(keyLevel) <= 1;
  const [downloading, setDownloading] = useState(false);
  /* 删除的步骤：null 没在删；'confirm' 确认框开着；'deleting' 已确认、等云端 */
  const [deleteStep, setDeleteStep] = useState(null);
  const deleting = deleteStep === 'deleting';
  const [removedRecIds, setRemovedRecIds] = useState(() => new Set());

  /* 下载：用播放地址把视频取回来，再按环境保存（PC 下载 / 手机分享面板 / APP 需壳支持，同实时录制）。
     S3 桶允许跨域 GET，所以前端能直接取。声音在 MP4 自带的音轨里（固件直接录进 MP4），下载的就是带声音的文件。
     不走缓存：画面框里的 <video> 播过同一地址时，缓存里那份是不带跨域头的，fetch 读到它会被 CORS 拦下 */
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
      const response = await fetch(url, { cache: 'no-store' });
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
    setDeleteStep('deleting');
    const response = await face3.deleteFace3Recording(deviceUUID, item.recId);
    setDeleteStep(null);
    if (!response.success) {
      if (response.message === 'no_permission') notify('warning', 'face3.recordings.deleteNoPermission');
      else notifyFailure('delete', response.message, 'face3.recordings.deleteFailed');
      return;
    }
    setRemovedRecIds((old) => new Set(old).add(item.recId));
    playback.stop(); // 确认框是模态的，删除期间选不了别的录像
    notify('success', 'face3.recordings.deleted');
  };

  /* Face3 列表随公司设备列表加载（App 启动 / 公司切换时 useManageDevice 自动拉取），
     直接打开详情页（刷新、推送冷启动）不需要再单独请求。 */

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
            durationMs={playback.selected.durationMs}
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
    <Box sx={{ bgcolor: 'background.paper', height: fill ? '100%' : { xs: '100%', md: 'auto' } }}>
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
          /* 放进设备列表旁的面板时撑满面板：录像列表占满整列高度 */
          height: fill ? '100%' : { xs: '100%', md: 'auto' },
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            flex: { xs: 'none', md: fill ? '3 1 0' : '1 1 0' },
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              aspectRatio: '16 / 9',
              bgcolor: '#2A2A2E',
              overflow: 'hidden',
              ...(fill && { borderRadius: '16px' }),
            }}
          >
            {renderFrame()}
          </Box>
          {/* 工具栏一行等宽：第一格是 AI 开关（任何时候都能点），后面随画面框换——
              实时是拍照、录制、视频对讲（共四格）；选中录像是下载、删除（共三格，整行居中）。
              后几格：看实时时由 Face3LiveView 用 portal 渲染进这个节点，出画后可用；
              没在看实时时这里放一份（选中录像是录像工具，否则是灰色不可点的实时工具） */}
          <Box sx={{ display: 'flex', bgcolor: 'background.paper' }}>
            {device && (
              <Face3AiTool
                on={isAiOn(deviceUUID) && !aiStopping}
                pending={aiPending[deviceUUID]}
                stopping={aiStopping}
                onToggle={() => toggleAi(device)}
              />
            )}
            <Box sx={{ flex: device && !live && playback.selected ? 2 : 3, minWidth: 0 }}>
              <Box ref={setToolsTarget} />
              {device &&
                !live &&
                (playback.selected ? (
                  <Face3RecordingToolbar
                    canDownload={Boolean(playback.media?.mp4)}
                    downloading={downloading}
                    onDownload={downloadRecording}
                    canDelete={canDelete}
                    deleting={deleteStep !== null}
                    onDelete={() => setDeleteStep('confirm')}
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
              flex: { xs: '1 1 auto', md: fill ? '2 1 0' : '1 1 0' },
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
                listRecordings={face3.listFace3Recordings}
                selectedRecId={playback.selected?.recId}
                onSelect={playRecording}
                removedRecIds={removedRecIds}
                headerAction={
                  /* 没在看：「观看实时画面」按钮。点了之后原位置：出画前毫秒计时；首次出画（或出错）后定格为
                     「本次唤醒耗时 / 未能出画 x.xxx s」一直显示，点画面右上角关闭结束观看后才换回按钮 */
                  !live ? (
                    <LiveButton online={online} lastSeenAt={lastSeenAt} onClick={startLive} />
                  ) : liveStartedAt ? (
                    <LiveWaitBadge startedAt={liveStartedAt} result={liveWait} />
                  ) : null
                }
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* 删除录像前确认：删了云端就没有了 */}
      <Dialog open={deleteStep !== null} onClose={() => !deleting && setDeleteStep(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('face3.recordings.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {playback.selected ? recordingLabel(playback.selected) : ''}
            {' · '}
            {t('face3.recordings.deleteConfirmText')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={deleting} onClick={() => setDeleteStep(null)}>
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

export default React.memo(Face3DevicePanel);
