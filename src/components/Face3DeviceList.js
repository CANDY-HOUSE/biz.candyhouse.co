import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Chip,
  Skeleton,
  IconButton,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';
import Face3AddDevice from '@/components/Face3AddDevice';
import Face3LiveView from '@/components/Face3LiveView';

/** 列表拉不回来时不能一直转圈 —— sendMessage 断网是静默丢弃的 */
const LIST_TIMEOUT_MS = 15000;

/** 在线状态的刷新间隔。
 *
 * 云端判在线靠的是连接记录还在不在，设备掉线后要等 API Gateway 的空闲超时
 * （十分钟量级）才会触发 $disconnect，所以刷得再快也快不过那个粒度。
 * 30 秒是个折中：用户手动下拉之外还能自己变，又不会把 WS 刷满。 */
const REFRESH_INTERVAL_MS = 30000;

/** 唤醒命令的等待上限。和 list 同理：sendMessage 断网是静默丢弃的。 */
const WAKE_TIMEOUT_MS = 15000;

/** 预览区占位图标的边长。唤醒按钮压在它正下方居中，改这里按钮会跟着走。 */
const PREVIEW_ICON_SIZE = 56;
/** 图标底边到按钮顶边的间距 */
const WAKE_BTN_GAP = 14;

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

/**
 * 一台设备一张卡：上面是预览区，下面一条信息栏。
 *
 * 预览区现在是占位 —— 云端还没有截图字段（face3_devices 里没有），
 * 等有了直接把 <VisionIcon> 换成 <img> 即可，版式不用动。
 */
const DeviceCard = ({ device, onOpen, onWake, onUnbind, waking }) => {
  const { t } = useTranslation();
  const rel = useRelativeTime();
  const name = device.displayName || device.deviceId;
  const roleKey = ['owner', 'manager', 'guest'].includes(device.role) ? device.role : null;
  const [menuAnchor, setMenuAnchor] = useState(null);

  return (
    <Card
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <CardActionArea onClick={() => onOpen?.(device)}>
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
          {device.lastSeenAt > 0 && (
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
              {rel(device.lastSeenAt)}
            </Typography>
          )}

          {/* 离线时压一层灰，一眼能和在线的区分开 */}
          {!device.online && (
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
            px: 1.5,
            py: 1,
            bgcolor: 'white',
          }}
        >
          <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0 }}>
            <VisionIcon width={20} height={20} />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </Typography>
            {roleKey && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t(`deviceMember.role.${roleKey}`)}
              </Typography>
            )}
          </Box>

          {device.online && (
            <Chip
              size="small"
              label={t('face3.live')}
              sx={{
                height: 22,
                bgcolor: '#FDECEC',
                color: '#D32F2F',
                fontWeight: 600,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
          <KeyboardArrowRightIcon sx={{ color: 'text.disabled' }} />
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
          disabled={!device.online || waking}
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
            '&:hover': { bgcolor: 'rgba(0,0,0,0.72)' },
            '&.Mui-disabled': {
              bgcolor: 'rgba(0,0,0,0.35)',
              color: 'rgba(255,255,255,0.4)',
            },
          }}
        >
          {waking ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : <PlayArrowIcon />}
        </IconButton>
      </Box>

      {/* 右上角"更多操作"菜单（目前只有解绑）。
       *
       * 同 wake 按钮，必须放在 CardActionArea 外面：否则点击会冒泡成"打开设备"，
       * 且按钮套按钮是非法 DOM 嵌套。stopPropagation 再兜一道。 */}
      <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
        <IconButton
          size="small"
          aria-label={t('face3.moreActions')}
          onClick={(e) => {
            e.stopPropagation();
            setMenuAnchor(e.currentTarget);
          }}
          sx={{
            bgcolor: 'rgba(0,0,0,0.45)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onUnbind?.(device);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('face3.unbind')}</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Card>
  );
};

/**
 * 扫码绑定过的 Face3 列表。
 *
 * 数据来自 WS 路由 biz3Face3Qr 的 op:"list" —— 云端从连接记录取 subUUID，
 * 只会返回当前登录用户名下的设备（见 doc/face3-identity-model.md 第 5.7 节）。
 */
export default function Face3DeviceList({ onOpen }) {
  const { t } = useTranslation();
  const { gFace3Qr } = useContext(GlobalStateContext);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [attempt, setAttempt] = useState(0);

  /* 只取出要用的那个函数，不要把 gFace3Qr 整个放进依赖。
   *
   * useFace3Qr() 每次 render 都返回新的对象字面量，而 list 成功会 setFace3Devices
   * -> provider 重渲染 -> gFace3Qr 换新引用 -> effect 重跑 -> 再发一次 list，
   * 自己喂自己，秒级刷屏。listFace3Devices 本身是 useCallback([registerCallback])，
   * 而 registerCallback 的依赖是空数组，所以它跨渲染稳定，可以安全地作依赖。
   *
   * 项目里既有页面（schedule-list）也是这个写法：effect 里直接调，
   * 依赖放具体的值而不是 hook 对象。 */
  const { listFace3Devices, wakeFace3Device, unbindFace3Device } = gFace3Qr;
  /* 第二道防线：两次请求至少隔 1 秒。
   *
   * 注意不能用"在途标志"来挡 —— React 在依赖变化时会先跑 cleanup 再跑新的
   * effect body，标志会被 cleanup 清掉，循环照样成立。按时间节流才拦得住。
   *
   * 代价是 1 秒内连点两次重试只会发一次，这个可以接受。 */
  const lastReqAt = useRef(0);
  /* 是否已经成功拿过一次数据。决定"要不要显示骨架屏" */
  const hasLoaded = useRef(false);

  useEffect(() => {
    const now = Date.now();
    if (now - lastReqAt.current < 1000) {
      return undefined;
    }
    lastReqAt.current = now;

    let settled = false;
    /* 定时刷新时不要退回 loading —— 否则每 30 秒列表闪一下。
       只有首次才显示骨架屏。用 ref 而不是读 gFace3Qr：effect 里读到的是
       创建那一刻捕获的引用，拿它判断会失准。 */
    if (!hasLoaded.current) {
      setState('loading');
    }

    const finish = (next) => {
      if (settled) return;
      settled = true;
      setState(next);
    };

    /* sendMessage 断网时是静默丢弃、未连接时入队等待，两种都不会有回包，
       所以超时必须由这里兜住，否则一直转圈 */
    const timer = setTimeout(() => finish('error'), LIST_TIMEOUT_MS);

    listFace3Devices((message) => {
      clearTimeout(timer);
      if (message?.success) hasLoaded.current = true;
      finish(message?.success ? 'ready' : 'error');
    });

    return () => clearTimeout(timer);
    // attempt 变化 = 用户点了重试
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

  const face3Devices = gFace3Qr.face3Devices || [];
  const [adding, setAdding] = useState(false);

  /* 正在唤醒的设备。同一时刻只允许一台在途，避免连点发一串命令。 */
  const [wakingId, setWakingId] = useState(null);
  /* 正在观看的设备。唤醒成功后才打开播放弹窗 —— 设备没醒的话频道里没人推流，
     直接开只会转圈然后超时。 */
  const [viewing, setViewing] = useState(null);
  const [toast, setToast] = useState(null); // { severity, text }
  /* 解绑确认弹窗的目标设备；非空即打开弹窗。unbinding 标记请求在途，防连点。 */
  const [unbindTarget, setUnbindTarget] = useState(null);
  const [unbinding, setUnbinding] = useState(false);

  /* 唤醒失败的原因要说清楚，否则用户只知道"没反应"。
     云端的 message 见 Face3_qr.mjs 的 wakeDevice。 */
  const wakeErrorText = (message) => {
    switch (message) {
      case 'device_offline':
        return t('face3.wakeOffline');
      case 'not_bound':
        return t('face3.wakeNotBound');
      case 'device_identity_rejected':
        /* 设备身份公钥与云端钉住的对不上。可能是换了主板，也可能是固件派生出的
           密钥变了 —— 两种都要人去查，不是用户能自助解决的。 */
        return t('face3.wakeIdentityRejected');
      case 'device_not_signable':
        /* 云端签不出这条命令：设备固件太老（没上报会话 nonce），
           或者它的身份公钥没通过核验。都得线下处理，别让用户干等。 */
        return t('face3.wakeNeedsUpdate');
      default:
        return t('face3.wakeFailed');
    }
  };

  const handleWake = (device) => {
    if (!device?.deviceId || wakingId) return;
    setWakingId(device.deviceId);

    let settled = false;
    const finish = (severity, text) => {
      if (settled) return;
      settled = true;
      setWakingId(null);
      setToast({ severity, text });
    };

    /* 断网时 sendMessage 静默丢弃，不会有回包 —— 转圈必须由这里收尾 */
    const timer = setTimeout(() => finish('error', t('face3.errTimeout')), WAKE_TIMEOUT_MS);

    wakeFace3Device(device.deviceId, (message) => {
      clearTimeout(timer);
      if (message?.success) {
        /* 唤醒只代表命令递到了 WiFi 模块，T32 还要冷启动几秒。直接开播放窗，
           让它自己转圈等 —— 比先弹一个"已发送"提示、再让用户手动点一次顺。
           播放端本身有 20 秒超时和重试按钮兜底。 */
        finish('success', t('face3.wakeSent'));
        setViewing(device);
      } else {
        finish('error', wakeErrorText(message?.message));
      }
    });
  };

  /* 解绑：点菜单项先弹确认框（破坏性操作），确认后才发请求。 */
  const handleUnbindRequest = (device) => {
    if (!device?.deviceId) return;
    setUnbindTarget(device);
  };

  const handleUnbindConfirm = () => {
    const device = unbindTarget;
    if (!device?.deviceId || unbinding) return;
    setUnbinding(true);

    let settled = false;
    const finish = (severity, text) => {
      if (settled) return;
      settled = true;
      setUnbinding(false);
      setUnbindTarget(null);
      setToast({ severity, text });
    };

    /* 同 wake：断网时 sendMessage 静默丢弃、无回包，靠超时收尾 */
    const timer = setTimeout(() => finish('error', t('face3.errTimeout')), WAKE_TIMEOUT_MS);

    unbindFace3Device(device.deviceId, (message) => {
      clearTimeout(timer);
      /* 成功后这台设备由 hook 从列表里摘除（见 useFace3Qr 的 unbind 分支），
         这里只负责提示与收尾。 */
      finish(
        message?.success ? 'success' : 'error',
        message?.success ? t('face3.unbindSuccess') : t('face3.unbindFailed')
      );
    });
  };

  /* 顶栏：设备数 + 右侧的加号。参考图右上角就是这个位置。
     空列表时也要有，否则用户没有任何入口去绑第一台设备 —— 这次就栽在这。 */
  const header = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        pt: 2,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('face3.myFace3Devices')}
      </Typography>
      <IconButton onClick={() => setAdding(true)} aria-label={t('face3.addFace3Device')}>
        <AddIcon />
      </IconButton>
    </Box>
  );

  const addDialog = (
    <Face3AddDevice
      open={adding}
      onClose={() => setAdding(false)}
      onBound={() => {
        setAdding(false);
        /* 绑完立刻重拉，新设备马上出现在列表里 */
        setAttempt((n) => n + 1);
      }}
    />
  );

  /* 已经有数据就别退回骨架屏 —— 手动刷新时列表不该整块闪没 */
  if (state === 'loading' && face3Devices.length === 0) {
    return (
      <Box>
        {header}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} variant="rounded" height={220} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
        {addDialog}
      </Box>
    );
  }

  if (state === 'error' && face3Devices.length === 0) {
    return (
      <Box>
        {header}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            py: 6,
            px: 3,
            textAlign: 'center',
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 48, color: 'warning.main' }} />
          <Typography variant="body2">{t('face3.listFailed')}</Typography>
          <IconButton onClick={() => setAttempt((n) => n + 1)} aria-label={t('face3.retry')}>
            <RefreshIcon />
          </IconButton>
        </Box>
        {addDialog}
      </Box>
    );
  }

  if (face3Devices.length === 0) {
    return (
      <Box>
        {header}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            py: 6,
            px: 3,
            textAlign: 'center',
          }}
        >
          <Box sx={{ color: 'text.disabled', display: 'flex' }}>
            <VisionIcon width={72} height={72} />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('face3.noFace3Devices')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {t('face3.noFace3DevicesHint')}
          </Typography>
          {/* 空列表也要有明确的下一步动作，光有提示文字用户会以为功能没做 */}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdding(true)} sx={{ mt: 1 }}>
            {t('face3.addFace3Device')}
          </Button>
        </Box>
        {addDialog}
      </Box>
    );
  }

  return (
    <Box>
      {header}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
        {face3Devices.map((d) => (
          <DeviceCard
            key={d.deviceId}
            device={d}
            onOpen={onOpen}
            onWake={handleWake}
            onUnbind={handleUnbindRequest}
            waking={wakingId === d.deviceId}
          />
        ))}
      </Box>
      {addDialog}
      <Face3LiveView open={Boolean(viewing)} device={viewing} onClose={() => setViewing(null)} />

      {/* 解绑确认。破坏性操作，先确认再发。 */}
      <Dialog
        open={Boolean(unbindTarget)}
        onClose={() => {
          if (!unbinding) setUnbindTarget(null);
        }}
      >
        <DialogTitle>{t('face3.unbindConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('face3.unbindConfirmBody', {
              name: unbindTarget?.displayName || unbindTarget?.deviceId || '',
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnbindTarget(null)} disabled={unbinding}>
            {t('face3.cancel')}
          </Button>
          <Button onClick={handleUnbindConfirm} color="error" disabled={unbinding}>
            {unbinding ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : t('face3.unbind')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {/* Snackbar 要求 children 恒定存在，toast 为空时给个空壳撑着 */}
        <Alert
          severity={toast?.severity || 'info'}
          variant="filled"
          onClose={() => setToast(null)}
          sx={{ width: '100%' }}
        >
          {toast?.text || ''}
        </Alert>
      </Snackbar>
    </Box>
  );
}
