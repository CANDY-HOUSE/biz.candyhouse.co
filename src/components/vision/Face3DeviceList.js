import React, { useContext, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  IconButton,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';
import Face3LiveView from './Face3LiveView';
import Face3EventRecordings from './Face3EventRecordings';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import MoveDownIcon from '@mui/icons-material/MoveDown';
import WifiIcon from '@mui/icons-material/Wifi';
import Wifi2BarIcon from '@mui/icons-material/Wifi2Bar';
import Wifi1BarIcon from '@mui/icons-material/Wifi1Bar';
import BatteryStdIcon from '@mui/icons-material/BatteryStd';
import Face3BioMigrate from './Face3BioMigrate';
import { selectFace3Protocol } from './protocols';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import { biz3utils } from '@/utils/biz3utils';
import { useNavigateUtils } from '@/hooks/useNavigateUtils';
import { isGuestAppSession } from '@/services/appSession';
import { gConfig } from '@constants/gConfig';

/** 在线状态的刷新间隔。
 *
 * 云端判在线靠的是连接记录还在不在，设备掉线后要等 API Gateway 的空闲超时
 * （十分钟量级）才会触发 $disconnect，所以刷得再快也快不过那个粒度。
 * 30 秒是个折中：用户手动下拉之外还能自己变，又不会把 WS 刷满。 */
const REFRESH_INTERVAL_MS = 30000;

/** 预览区占位图标的边长。唤醒按钮压在它正下方居中，改这里按钮会跟着走。 */
const PREVIEW_ICON_SIZE = 56;
/** 图标底边到按钮顶边的间距 */
const WAKE_BTN_GAP = 14;

/* AI 开关按设备只记在本机（与 Face3LiveView 的扬声器偏好同样的做法）。
   暂时也用它选实时画面的协议：开 → LiveKit，关 → KVS 直连（见 ./protocols）。
   localStorage 在无痕/禁用存储时会抛，读不到就当关。 */
const aiPrefKey = (deviceUUID) => `face3.ai.${String(deviceUUID || '').toUpperCase()}`;
const loadAiPref = (deviceUUID) => {
  try {
    return localStorage.getItem(aiPrefKey(deviceUUID)) === '1';
  } catch (_) {
    return false;
  }
};
const saveAiPref = (deviceUUID, enabled) => {
  try {
    if (enabled) localStorage.setItem(aiPrefKey(deviceUUID), '1');
    else localStorage.removeItem(aiPrefKey(deviceUUID));
  } catch (_) {
    /* 存不下就只在本次页面内生效 */
  }
};

/** 把 lastSeenAt 说成人话。列表上只要"多久以前"，不需要精确时刻。 */
const useRelativeTime = () => {
  const { t } = useTranslation();
  return (ms) => {
    if (!ms) return '';
    const diff = Date.now() - ms;
    if (diff < 60_000) return t('face3.justNow');
    if (diff < 3600_000) return t('face3.minutesAgo', { n: Math.floor(diff / 60_000) });
    if (diff < 86400_000) return t('face3.hoursAgo', { n: Math.floor(diff / 3600_000) });
    return t('face3.daysAgo', { n: Math.floor(diff / 86400_000) });
  };
};

/** 信号强度分三档显示；数值照样写出来，排查时有用。 */
const wifiSignalIcon = (rssi) => {
  if (rssi >= -60) return WifiIcon;
  if (rssi >= -75) return Wifi2BarIcon;
  return Wifi1BarIcon;
};

/**
 * 设备最近一次上报的 WiFi 与电量（云端 face3_status，每次联网上报时更新，不过期）。
 *
 * 设备离线很久也照样显示最后一次的值，所以必须带"更新于多久以前"，
 * 否则用户分不清这是现在的状态还是几个月前的。没上报过的设备（旧固件）整行不显示。
 */
const DeviceStatusLine = ({ stateInfo }) => {
  const { t } = useTranslation();
  const rel = useRelativeTime();
  const { wifiSsid, wifiRssi, wifiUpdatedAt, batteryPct, batteryUpdatedAt } = stateInfo || {};
  const hasWifi = typeof wifiSsid === 'string' && wifiSsid !== '';
  const hasBattery = typeof batteryPct === 'number';
  if (!hasWifi && !hasBattery) return null;
  const SignalIcon = typeof wifiRssi === 'number' ? wifiSignalIcon(wifiRssi) : WifiIcon;
  const updatedAt = Math.max(Number(wifiUpdatedAt) || 0, Number(batteryUpdatedAt) || 0);
  const iconSx = { fontSize: 14, flexShrink: 0 };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', minWidth: 0, mt: 0.25 }}>
      {hasWifi && (
        <>
          <SignalIcon sx={iconSx} aria-label={t('face3.wifi')} />
          <Typography
            variant="caption"
            sx={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {wifiSsid}
          </Typography>
          {typeof wifiRssi === 'number' && (
            <Typography variant="caption" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {`${wifiRssi} dBm`}
            </Typography>
          )}
        </>
      )}
      {hasBattery && (
        <>
          <BatteryStdIcon sx={{ ...iconSx, ml: hasWifi ? 0.5 : 0 }} aria-label={t('face3.battery')} />
          <Typography variant="caption" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {`${Math.round(batteryPct)}%`}
          </Typography>
        </>
      )}
      {updatedAt > 0 && (
        <Typography variant="caption" sx={{ flexShrink: 0, ml: 0.5, color: 'text.disabled' }}>
          {t('face3.statusUpdated', { time: rel(updatedAt) })}
        </Typography>
      )}
    </Box>
  );
};

/**
 * 一台设备一张卡：上面是预览区，下面一条信息栏。
 *
 * 预览区现在是占位 —— 云端还没有截图字段（face3_devices 里没有），
 * 等有了直接把 <VisionIcon> 换成 <img> 即可，版式不用动。
 */
const DeviceCard = ({
  device,
  onOpen,
  onWake,
  onCloseView,
  onRecordings,
  onMigrate,
  aiOn,
  onToggleAi,
  waking,
  isViewing,
}) => {
  const { t } = useTranslation();
  const rel = useRelativeTime();
  const name = device.deviceName || device.deviceUUID;
  const roleKey = device.stateInfo?.isOwner ? 'owner' : null;
  const online = device.stateInfo?.wm2State === true;
  const lastSeenAt = device.stateInfo?.lastSeenAt;

  return (
    <Card
      sx={{
        position: 'relative',
        p: 0,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <CardActionArea
        disableRipple
        onClick={() => onOpen?.(device)}
        sx={{ '& .MuiCardActionArea-focusHighlight': { opacity: '0 !important' } }}
      >
        {/* 预览区。16:9 与摄像头出图比例一致，将来换成真截图不会跳版 */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            bgcolor: '#2A2A2E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ color: 'rgba(255,255,255,0.28)', display: 'flex' }}>
            <VisionIcon width={PREVIEW_ICON_SIZE} height={PREVIEW_ICON_SIZE} />
          </Box>

          {/* 时间戳压在右下角，和参考图一致 */}
          {lastSeenAt > 0 && (
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                right: 8,
                bottom: 6,
                color: 'rgba(255,255,255,0.75)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {rel(lastSeenAt)}
            </Typography>
          )}

          {/* 离线时压一层灰，一眼能和在线的区分开 */}
          {!online && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {t('face3.offline')}
              </Typography>
            </Box>
          )}
        </Box>

        {/* 信息栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pl: 1.5,
            pr: 0,
            py: 1,
            bgcolor: 'white',
          }}
        >
          <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0 }}>
            <VisionIcon width={20} height={20} />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography
                variant="body2"
                sx={{
                  minWidth: 0,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {name}
              </Typography>
              {online && (
                <Box
                  component="span"
                  aria-label={t('face3.live')}
                  sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }}
                />
              )}
            </Box>
            {roleKey && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t(`deviceMember.role.${roleKey}`)}
              </Typography>
            )}
            <DeviceStatusLine stateInfo={device.stateInfo} />
          </Box>

          <KeyboardArrowRightIcon sx={{ color: 'text.disabled', mr: -0.5 }} />
        </Box>
      </CardActionArea>

      {/* 唤醒按钮。
       *
       * 必须放在 CardActionArea 外面：按钮套按钮既是非法的 DOM 嵌套，点击也会
       * 一路冒泡成"打开设备"。这里用一个和预览区同尺寸的透明层来定位，
       * pointerEvents 关掉，只有按钮本身可点，卡片其余部分照常能按。
       *
       * 压在占位图标正下方居中。偏移量由 PREVIEW_ICON_SIZE 算出来，不写死 ——
       * 图标改大小时按钮会跟着走，不会悄悄错位。
       *
       * 离线时中间会盖一层"离线"字样，它垂直居中；按钮在图标下方，两者不重叠。 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          aspectRatio: '16 / 9',
          pointerEvents: 'none',
        }}
      >
        <IconButton
          disabled={!online || waking}
          onClick={() => onWake?.(device)}
          aria-label={t('face3.wake')}
          sx={{
            pointerEvents: 'auto',
            position: 'absolute',
            left: '50%',
            top: '50%',
            /* translate 的 -50% 负责水平居中；纵向推到图标底边再留一个间距 */
            transform: `translate(-50%, ${PREVIEW_ICON_SIZE / 2 + WAKE_BTN_GAP}px)`,
            width: 44,
            height: 44,
            bgcolor: 'rgba(0,0,0,0.55)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' },
            '&.Mui-disabled': {
              bgcolor: 'rgba(0,0,0,0.35)',
              color: 'rgba(255,255,255,0.4)',
            },
          }}
        >
          {waking ? <CircularProgress size={20} /> : <PlayArrowIcon />}
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button startIcon={<VideoLibraryIcon />} onClick={() => onRecordings(device)} sx={{ m: 1 }}>
          {t('face3.recordings.title')}
        </Button>
        <Button startIcon={<MoveDownIcon />} onClick={() => onMigrate(device)} sx={{ m: 1 }}>
          {t('face3.migrate.entry')}
        </Button>
        {/* AI 开关：按设备记在本机；开启须登录（访客在 onToggleAi 里拦下） */}
        <FormControlLabel
          sx={{ m: 1 }}
          control={
            <Switch size="small" checked={aiOn} onChange={(event) => onToggleAi(device, event.target.checked)} />
          }
          label={t('face3.ai.label')}
        />
      </Box>

      {/* 就地播放：观看该设备时，实时画面直接铺在预览框位置，盖住占位/唤醒/设置按钮。
          Face3LiveView 自带 #000 不透明背景，所以下面那几层不必再逐个隐藏。 */}
      {isViewing && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: '16 / 9' }}>
          <Face3LiveView device={device} protocol={selectFace3Protocol({ aiEnabled: aiOn })} onClose={onCloseView} />
        </Box>
      )}
    </Card>
  );
};

/**
 * 扫码绑定过的 Face3 列表。
 *
 * 数据来自 WS 路由 biz3Face3Qr 的 op:"list" —— 云端从连接记录取 subUUID，
 * 只会返回当前登录用户名下的设备（见 doc/face3-identity-model.md 第 5.7 节）。
 */
export default function Face3DeviceList() {
  const { t } = useTranslation();
  const { navigateToDeviceDetail } = useNavigateUtils();
  const { gAuth, gFace3, gStripe, gManageGroup, gManageDevice, setSnackbarValue } = useContext(GlobalStateContext);
  const [attempt, setAttempt] = useState(0);
  const floatingAddRef = useRef(null);

  /* 只取出要用的那个函数，不要把 gFace3 整个放进依赖。
   *
   * useFace3() 每次 render 都返回新的对象字面量，而 list 成功会 setFace3Devices
   * -> provider 重渲染 -> gFace3 换新引用 -> effect 重跑 -> 再发一次 list，
   * 自己喂自己，秒级刷屏。listFace3Devices 本身是 useCallback([registerCallback])，
   * 而 registerCallback 的依赖是空数组，所以它跨渲染稳定，可以安全地作依赖。
   *
   * 项目里既有页面（schedule-list）也是这个写法：effect 里直接调，
   * 依赖放具体的值而不是 hook 对象。 */
  const { listFace3Devices } = gFace3;
  /* 第二道防线：两次请求至少隔 1 秒。
   *
   * 注意不能用"在途标志"来挡 —— React 在依赖变化时会先跑 cleanup 再跑新的
   * effect body，标志会被 cleanup 清掉，循环照样成立。按时间节流才拦得住。
   *
   * 代价是 1 秒内连点两次重试只会发一次，这个可以接受。 */
  const lastReqAt = useRef(0);

  useEffect(() => {
    /* 节流：两次请求至少隔 1 秒，挡住 gFace3 引用变化导致的自我喂食循环
       （见上方 provider 说明）。 */
    const now = Date.now();
    if (now - lastReqAt.current < 1000) return undefined;
    lastReqAt.current = now;

    /* 只负责触发一次 list，把 face3Devices 灌进 provider。渲染只看 face3Devices
       的数量：0 → 猫头鹰，>0 → 列表，不再用 loading/error 状态机（Face3 未发布，
       没设备的用户只见猫头鹰、不打扰）。断网/失败时 face3Devices 保持原样不变。 */
    listFace3Devices(() => {});
    return undefined;
    // attempt 变化 = 定时刷新 / 用户重试
  }, [listFace3Devices, attempt]);

  /* 定时刷新，让在线/离线自己变。
   *
   * 只在页面可见时刷：切到后台还轮询纯属浪费，而且回到前台时那批积压的
   * 定时器会一起触发。回到前台立刻补一次，用户看到的就是当下的状态。 */
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      setAttempt((n) => n + 1);
    };
    const timer = setInterval(tick, REFRESH_INTERVAL_MS);
    /* 回到前台立刻对齐一次，不用等下一个周期 */
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const face3Devices = gFace3.face3Devices || [];

  const [viewingIds, setViewingIds] = useState(() => new Set());
  const [recordingDevice, setRecordingDevice] = useState(null);
  const [migrateDevice, setMigrateDevice] = useState(null);

  /* AI 开关。登录态 = 已拿到登录用户信息且不是 APP 访客会话：
     PC 只能登录后进来；APP 访客的 customerInfo.isAnonymous 为 true。未登录时一律显示关。 */
  const signedIn =
    gAuth.loginState !== gConfig.loginState.loginOut &&
    !isGuestAppSession() &&
    Boolean(gStripe.customerInfo.subUUID) &&
    gStripe.customerInfo.isAnonymous !== true;
  /* 本次页面内切换过的设备 -> 开关值；没切换过的读本机存储 */
  const [aiPrefs, setAiPrefs] = useState({});
  const isAiOn = (deviceUUID) => {
    if (!signedIn) return false;
    const id = deviceUUID.toUpperCase();
    return id in aiPrefs ? aiPrefs[id] : loadAiPref(id);
  };

  const handleToggleAi = (device, enabled) => {
    if (enabled && !signedIn) {
      setSnackbarValue({ open: true, severity: 'info', msg: t('face3.ai.loginRequired') });
      return;
    }
    const id = device.deviceUUID.toUpperCase();
    saveAiPref(id, enabled);
    setAiPrefs((prefs) => ({ ...prefs, [id]: enabled }));
  };

  const handleWake = (device) => {
    if (!device?.deviceUUID) return;
    // 通话组件统一负责环境预检、唤醒和连接，关闭即取消本轮异步工作。
    setViewingIds((ids) => new Set(ids).add(device.deviceUUID));
  };

  /* 门铃推送点进来：/vision?deviceUUID=<id>&live=1 直接打开这台的实时画面。
     等列表里有这台再开（App 冷启动时列表要先拉回来）；开过就把参数去掉，
     免得刷新或返回时再开一次。列表里没有这台（已解绑/无权限）就静默忽略。 */
  const [searchParams, setSearchParams] = useSearchParams();
  const liveUUID = searchParams.get('live') === '1' ? (searchParams.get('deviceUUID') || '').toUpperCase() : '';
  useEffect(() => {
    if (!liveUUID) return;
    const device = face3Devices.find((d) => (d.deviceUUID || '').toUpperCase() === liveUUID);
    if (!device) return;
    handleWake(device);
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete('deviceUUID');
        next.delete('live');
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveUUID, face3Devices]);

  const addDeviceMenu = (
    <Box>
      <Typography variant="h2" sx={{ px: 1 }}>
        新規デバイスを追加
      </Typography>
      <Box sx={{ px: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Button variant="text" component="label" startIcon={<QrCodeIcon />} sx={{ justifyContent: 'flex-start' }}>
          QRコードで追加
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(event) => {
              const fileInput = event.target;
              biz3utils.readQrcodeUrl(fileInput.files[0], (error, qrUrl) => {
                if (error || !qrUrl) {
                  floatingAddRef.current?.handleClose();
                  setSnackbarValue({ open: true, msg: t('face3.errInvalidQr') });
                  fileInput.value = '';
                  return;
                }
                gManageGroup.redeemQRToken(qrUrl, (response) => {
                  floatingAddRef.current?.handleClose();
                  if (!response?.success) {
                    setSnackbarValue({
                      logScope: 'components/Face3DeviceList.addDeviceMenu',
                      logReason: 'face3.errUnknown',
                      severity: 'error',
                      open: true,
                      msg: response?.message || t('face3.errUnknown'),
                    });
                    fileInput.value = '';
                    return;
                  }
                  const device = biz3utils.parseDeviceKeyFromUrl(response.data);
                  if (!device) {
                    setSnackbarValue({ open: true, msg: t('face3.errInvalidQr') });
                    fileInput.value = '';
                    return;
                  }
                  gManageDevice.addSesameDevicesToBiz3([device], () => setAttempt((n) => n + 1));
                  fileInput.value = '';
                });
              });
            }}
          />
        </Button>
      </Box>
    </Box>
  );

  /* 未添加 Face3 设备时（加载中 / 空 / 首次加载失败，凡是没有设备可展示）只显示猫头鹰，
     添加设备统一使用设备页同款的悬浮 "+"。 */
  if (face3Devices.length === 0) {
    return (
      <SesameFloatingAdd ref={floatingAddRef} isMobile={!gStripe.isFromApp} popupComponent={addDeviceMenu}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            color: 'text.disabled',
          }}
        >
          <VisionIcon width={96} height={96} />
        </Box>
      </SesameFloatingAdd>
    );
  }

  return (
    <SesameFloatingAdd ref={floatingAddRef} isMobile={!gStripe.isFromApp} popupComponent={addDeviceMenu}>
      <Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
          {face3Devices.map((d) => (
            <DeviceCard
              key={d.deviceUUID}
              device={d}
              onOpen={navigateToDeviceDetail}
              onWake={handleWake}
              onRecordings={(device) => {
                setViewingIds(new Set());
                setRecordingDevice(device);
              }}
              onMigrate={(device) => {
                setViewingIds(new Set());
                setMigrateDevice(device);
              }}
              aiOn={isAiOn(d.deviceUUID)}
              onToggleAi={handleToggleAi}
              onCloseView={() =>
                setViewingIds((ids) => {
                  const next = new Set(ids);
                  next.delete(d.deviceUUID);
                  return next;
                })
              }
              waking={viewingIds.has(d.deviceUUID)}
              isViewing={viewingIds.has(d.deviceUUID)}
            />
          ))}
        </Box>
        {recordingDevice && (
          <Face3EventRecordings
            key={recordingDevice.deviceUUID}
            device={recordingDevice}
            onClose={() => setRecordingDevice(null)}
          />
        )}
        {migrateDevice && (
          <Face3BioMigrate
            key={migrateDevice.deviceUUID}
            device={migrateDevice}
            devices={face3Devices}
            onClose={() => setMigrateDevice(null)}
          />
        )}
      </Box>
    </SesameFloatingAdd>
  );
}
