import React, { useContext, useEffect, useState, useRef } from 'react';
import { createSearchParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Card, CardActionArea, IconButton, Button, ButtonBase } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { ios } from '@/theme/appHomeStyle';
import QrCodeIcon from '@mui/icons-material/QrCode';
import WifiIcon from '@mui/icons-material/Wifi';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';
import { carryFace3Live, Face3LiveSlot, useFace3LiveSession } from './face3LiveSession';
import { selectFace3Protocol } from './protocols';
import { useFace3Ai } from './face3AiPref';
import { useRelativeTime } from './face3RelativeTime';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import { biz3utils } from '@/utils/biz3utils';
import { isAppHome } from '@/services/deviceService';
import { gConfig } from '@constants/gConfig';

/** 在线状态的刷新间隔。
 *
 * 云端判在线靠的是连接记录还在不在，设备掉线后要等 API Gateway 的空闲超时
 * （十分钟量级）才会触发 $disconnect，所以刷得再快也快不过那个粒度。
 * 30 秒是个折中：用户手动下拉之外还能自己变，又不会把 WS 刷满。 */
const REFRESH_INTERVAL_MS = 30000;

/** 设备详情页地址（Face3 的录像卡片在里面，手机上默认显示录像）。参数与 useNavigateUtils 一致。 */
const face3DetailLocation = (device, companyDevices) => {
  const listed = companyDevices.find((d) => d.deviceUUID?.toUpperCase() === device.deviceUUID?.toUpperCase());
  return {
    pathname: '/biz/access-control/region',
    search: createSearchParams({
      ...(isAppHome ? { appHome: '1', fromType: 'app' } : {}),
      deviceUUID: device.deviceUUID,
      keyLevel: String(listed?.keyLevel ?? device.keyLevel ?? (device.stateInfo?.isOwner ? 0 : '')),
      deviceModel: listed?.deviceModel || device.deviceModel || gConfig.sesameDeviceModel.sesame_face_3,
      deviceName: device.deviceName || '',
    }).toString(),
  };
};

/**
 * 一台设备一张卡：上面是预览区，下面一行名称。
 *
 * 首页只做两件事：预览区正中的 ▶ 就地看实时，点名称那一行进详情页；预览区其他地方点了没反应。
 * 预览区现在是空的 —— 云端还没有截图字段（face3_devices 里没有），
 * 等有了直接在预览区放 <img> 即可，版式不用动。
 */
const DeviceCard = ({ device, onOpen, onWake, isViewing }) => {
  const { t } = useTranslation();
  const rel = useRelativeTime();
  const name = device.deviceName || device.deviceUUID;
  const online = device.stateInfo?.wm2State === true;
  const lastSeenAt = device.stateInfo?.lastSeenAt;

  if (isAppHome) {
    return (
      <Box sx={{ bgcolor: ios.card, borderRadius: ios.cardRadius, overflow: 'hidden' }}>
        <ButtonBase
          onClick={() => onOpen(device)}
          sx={{
            width: '100%',
            minHeight: 60,
            justifyContent: 'flex-start',
            gap: '10px',
            pl: '20px',
            pr: '12px',
            py: '14px',
            transition: 'background-color 0.2s ease',
            '&:active': { bgcolor: ios.pressed },
          }}
        >
          <WifiIcon
            aria-label={online ? t('face3.live') : t('face3.offline')}
            sx={{ fontSize: 20, color: online ? 'rgba(60,60,67,0.85)' : ios.tertiaryLabel, flexShrink: 0 }}
          />
          <Typography
            sx={{
              minWidth: 0,
              fontSize: 20,
              fontWeight: 600,
              color: ios.label,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </Typography>
          {!online && (
            <Typography sx={{ fontSize: 14, color: ios.secondaryLabel, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {lastSeenAt > 0 ? `${t('face3.offline')} · ${rel(lastSeenAt)}` : t('face3.offline')}
            </Typography>
          )}
          <KeyboardArrowRightIcon sx={{ fontSize: 22, color: ios.tertiaryLabel, ml: 'auto', flexShrink: 0 }} />
        </ButtonBase>
        <Box
          sx={{
            position: 'relative',
            mx: '12px',
            mb: '12px',
            aspectRatio: '16 / 9',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'linear-gradient(160deg, #3A3A3C 0%, #1C1C1E 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <Box sx={{ display: 'flex', color: online ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.22)' }}>
            <VisionIcon width={48} height={48} />
          </Box>
          {online && (
            <IconButton
              onClick={() => onWake(device)}
              aria-label={t('face3.wake')}
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'rgba(255,255,255,0.9)',
                color: ios.label,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                transition: `transform 0.2s ${ios.spring}`,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                '&:active': { transform: 'scale(0.9)' },
              }}
            >
              <PlayArrowRoundedIcon sx={{ fontSize: 36 }} />
            </IconButton>
          )}
          {isViewing && (
            <Box sx={{ position: 'absolute', inset: 0 }}>
              <Face3LiveSlot />
            </Box>
          )}
        </Box>
      </Box>
    );
  }

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
      {/* 预览区。16:9 与摄像头出图比例一致，将来换成真截图不会跳版。离线时压一层灰。只有 ▶ 可点。 */}
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', bgcolor: '#2A2A2E' }}>
        {!online && <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)' }} />}
      </Box>

      {/* 名称行：点了进详情页。名称前是 Wi-Fi 图标，在线 / 离线配色与设备列表一致；
          离线在名称后写"离线 · 多久以前" */}
      <CardActionArea
        disableRipple
        onClick={() => onOpen(device)}
        sx={{ '& .MuiCardActionArea-focusHighlight': { opacity: '0 !important' } }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            minHeight: 44,
            pl: 1.5,
            pr: 0.5,
            py: 1,
            bgcolor: 'white',
          }}
        >
          <WifiIcon
            fontSize="small"
            aria-label={online ? t('face3.live') : t('face3.offline')}
            sx={{ color: online ? 'primary.main' : 'info.light', flexShrink: 0 }}
          />
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
          {!online && (
            <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {lastSeenAt > 0 ? `${t('face3.offline')} · ${rel(lastSeenAt)}` : t('face3.offline')}
            </Typography>
          )}
          <KeyboardArrowRightIcon sx={{ color: 'text.disabled', ml: 'auto', flexShrink: 0 }} />
        </Box>
      </CardActionArea>

      {/* ▶ 用一个和预览区同尺寸的透明层来定位，pointerEvents 关掉，只有按钮本身可点。离线不显示。 */}
      {online && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            aspectRatio: '16 / 9',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconButton
            onClick={() => onWake(device)}
            aria-label={t('face3.wake')}
            sx={{
              pointerEvents: 'auto',
              width: 56,
              height: 56,
              bgcolor: 'rgba(0,0,0,0.55)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' },
            }}
          >
            <PlayArrowIcon fontSize="large" />
          </IconButton>
        </Box>
      )}

      {/* 就地播放：实时画面直接铺在预览框位置，盖住 ▶。画面由全局会话渲染（见 face3LiveSession），
          这里只放槽位 —— 点进详情页时连接不断，画面跟着挪过去。
          Face3LiveView 自带 #000 不透明背景，所以下面那几层不必再逐个隐藏。 */}
      {isViewing && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: '16 / 9' }}>
          <Face3LiveSlot />
        </Box>
      )}
    </Card>
  );
};

/**
 * Vision 首页：扫码绑定过的 Face3 列表。
 *
 * 数据来自 WS 路由 biz3Face3Qr 的 op:"list" —— 云端从连接记录取 subUUID，
 * 只会返回当前登录用户名下的设备（见 doc/face3-identity-model.md 第 5.7 节）。
 * 首页和设备详情页（Face3DevicePanel）都能看实时画面，正在看的那台点进详情页不断开（见 face3LiveSession）；
 * 录像、AI 开关和拍照 / 录制等工具在详情页。
 */
export default function Face3DeviceList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gFace3, gStripe, gManageGroup, gManageDevice, setSnackbarValue } = useContext(GlobalStateContext);
  const [attempt, setAttempt] = useState(0);
  const floatingAddRef = useRef(null);
  const { isAiOn } = useFace3Ai();

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

  /* 实时画面是全局会话（同一时刻一路），换页面不断开；关闭按钮在画面里，关了即结束会话 */
  const liveSession = useFace3LiveSession();

  const handleWake = (device) => {
    if (!device?.deviceUUID) return;
    // 通话组件统一负责环境预检、唤醒和连接，关闭即取消本轮异步工作。
    liveSession.start(device, selectFace3Protocol({ aiEnabled: isAiOn(device.deviceUUID) }));
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
      {/* PC 与 APP 同一套布局：纵向一行一个 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: isAppHome ? '12px' : 2,
          p: isAppHome ? '8px 16px 16px' : 2,
        }}
      >
        {face3Devices.map((d) => (
          <DeviceCard
            key={d.deviceUUID}
            device={d}
            onOpen={(device) =>
              /* 正在看这台就把实时画面带进详情页（见 face3LiveSession） */
              navigate(face3DetailLocation(device, gManageDevice.companyDevices), {
                state: carryFace3Live(device.deviceUUID),
              })
            }
            onWake={handleWake}
            isViewing={liveSession.liveUUID === (d.deviceUUID || '').toUpperCase()}
          />
        ))}
      </Box>
    </SesameFloatingAdd>
  );
}
