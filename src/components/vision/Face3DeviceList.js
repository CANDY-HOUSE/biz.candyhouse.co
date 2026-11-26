import React, { useContext, useEffect, useState, useRef } from 'react';
import { createSearchParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Card, CardActionArea, IconButton, Button, ButtonBase } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import { ios, homeCards, hoverSx } from '@/theme/appHomeStyle';
import QrCodeIcon from '@mui/icons-material/QrCode';
import WifiIcon from '@mui/icons-material/Wifi';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';
import { carryFace3Live, Face3LiveSlot, useFace3Context } from './face3Context';
import { selectFace3Protocol } from './protocols';
import { relativeTime } from './face3Utils';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import { useMasterDetail } from '@/components/MasterDetail';
import { biz3utils } from '@/utils/biz3utils';
import { isAppHome } from '@/services/deviceService';
import { gConfig } from '@constants/gConfig';
import { PATHS } from '@/routes/manifest';

/** 设备详情页地址（Face3 的录像卡片在里面，手机上默认显示录像）。参数与 useNavigateUtils 一致。
 *  宽屏 PC 改去设备页，由列表旁的详情面板显示这台。 */
const face3DetailLocation = (device, companyDevices, pathname = PATHS.accessControl.region) => {
  const listed = companyDevices.find((d) => d.deviceUUID?.toUpperCase() === device.deviceUUID?.toUpperCase());
  return {
    pathname,
    search: createSearchParams({
      ...(isAppHome ? { appHome: '1', fromType: 'app' } : {}),
      deviceUUID: device.deviceUUID,
      keyLevel: String(listed?.keyLevel ?? device.keyLevel ?? (device.stateInfo?.isOwner ? 0 : '')),
      deviceModel: listed?.deviceModel || device.deviceModel || gConfig.sesameDeviceModel.sesame_face_3,
      deviceName: device.deviceName || '',
    }).toString(),
  };
};

const gridColumnsKey = 'face3GridColumns';

/* 宽屏宫格的列数由用户选，存在本机；localStorage 在无痕/禁用存储时会抛，读不到就用默认的两列 */
const savedGridColumns = () => {
  try {
    return Number(localStorage.getItem(gridColumnsKey)) || null;
  } catch {
    return null;
  }
};

const GridColumnsToggle = ({ value, onChange }) => (
  <Box role="radiogroup" sx={{ display: 'flex', p: '2px', bgcolor: ios.fill, borderRadius: '9px' }}>
    {[
      [1, SquareRoundedIcon],
      [2, GridViewRoundedIcon],
      [3, AppsRoundedIcon],
    ].map(([columns, Icon]) => (
      <ButtonBase
        key={columns}
        role="radio"
        aria-checked={value === columns}
        aria-label={`${columns}`}
        onClick={() => onChange(columns)}
        sx={{
          width: 40,
          height: 28,
          borderRadius: '7px',
          color: value === columns ? ios.label : ios.secondaryLabel,
          bgcolor: value === columns ? ios.card : 'transparent',
          boxShadow: value === columns ? '0 3px 8px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
          transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </ButtonBase>
    ))}
  </Box>
);

/**
 * 一台设备一张卡：上面是预览区，下面一行名称。
 *
 * 首页只做两件事：预览区正中的 ▶ 就地看实时，点名称那一行进详情页；预览区其他地方点了没反应。
 * 预览区现在是空的 —— 云端还没有截图字段（face3_devices 里没有），
 * 等有了直接在预览区放 <img> 即可，版式不用动。
 */
const DeviceCard = ({ device, onOpen, onWake, isViewing }) => {
  const { t } = useTranslation();
  const name = device.deviceName || device.deviceUUID;
  const online = device.stateInfo?.wm2State === true;
  const lastSeenAt = device.stateInfo?.lastSeenAt;

  if (homeCards) {
    return (
      <Box
        sx={{
          bgcolor: ios.card,
          borderRadius: ios.cardRadius,
          overflow: 'hidden',
        }}
      >
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
            ...hoverSx({ bgcolor: ios.pressed }),
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
              {lastSeenAt > 0 ? `${t('face3.offline')} · ${relativeTime(t, lastSeenAt)}` : t('face3.offline')}
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
              {lastSeenAt > 0 ? `${t('face3.offline')} · ${relativeTime(t, lastSeenAt)}` : t('face3.offline')}
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

      {/* 就地播放：实时画面直接铺在预览框位置，盖住 ▶。画面由 Face3Provider 里的会话渲染（见 face3Context），
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
 * 数据来自公司设备列表（biz3ManageDevice getCompanyDevice）里机型为 sesame_face_3 的设备，
 * 由 face3Context 筛出；在线 / WiFi / 电量都在 stateInfo 里（原 Face3_qr op:"list" 已去掉）。
 * 首页和设备详情页（Face3DevicePanel）都能看实时画面，正在看的那台点进详情页不断开（见 face3Context）；
 * 录像、AI 开关和拍照 / 录制等工具在详情页。
 */
export default function Face3DeviceList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  /* 全局 context 只用于添加设备菜单（扫码绑定）；Face3 的数据、AI 开关、实时会话从 useFace3Context() 取 */
  const { gStripe, gManageGroup, gManageDevice, setSnackbarValue } = useContext(GlobalStateContext);
  const face3 = useFace3Context();
  const masterDetail = useMasterDetail();
  const [pickedColumns, setPickedColumns] = useState(savedGridColumns);
  const floatingAddRef = useRef(null);

  /* Face3 列表 = 公司设备列表（companyDevices）按机型过滤（见 face3Context），本页不单独请求、不轮询：
   * 公司设备列表由 useManageDevice 加载，设备状态变化由服务端推送（pubDeviceStateChange）更新。
   * 渲染只看数量：0 → 猫头鹰，>0 → 列表。 */
  const face3Devices = face3.devices;
  const wideGrid = !isAppHome && homeCards;
  const gridColumns = pickedColumns || 2;
  const pickColumns = (columns) => {
    setPickedColumns(columns);
    try {
      localStorage.setItem(gridColumnsKey, String(columns));
    } catch {
      /* 存不下就只在本次页面内生效 */
    }
  };

  /* 实时画面是 Face3Provider 里的会话（同一时刻一路），换页面不断开；关闭按钮在画面里，关了即结束会话 */

  const handleWake = (device) => {
    if (!device?.deviceUUID) return;
    // 通话组件统一负责环境预检、唤醒和连接，关闭即取消本轮异步工作。
    face3.start(device, selectFace3Protocol({ aiEnabled: face3.isAiOn(device.deviceUUID) }));
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
        {t('face3.addNewDevice')}
      </Typography>
      <Box sx={{ px: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Button variant="text" component="label" startIcon={<QrCodeIcon />} sx={{ justifyContent: 'flex-start' }}>
          {t('contacts.addByQr')}
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
                  /* 添加成功后 useManageDevice 收到 op:'add' 回包会重取公司设备列表，Face3 列表随之更新 */
                  gManageDevice.addSesameDevicesToBiz3([device], () => {});
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
      {wideGrid && (
        <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', px: '16px', pt: '8px' }}>
          <GridColumnsToggle value={gridColumns} onChange={pickColumns} />
        </Box>
      )}
      {/* APP 一行一个；浏览器够宽时宫格：按用户选的一列 / 两列 / 三列，没选过是两列 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: wideGrid
            ? { xs: 'minmax(0, 1fr)', md: `repeat(${gridColumns}, minmax(0, 1fr))` }
            : 'minmax(0, 1fr)',
          gap: homeCards ? '12px' : 2,
          p: homeCards ? '8px 16px 16px' : 2,
        }}
      >
        {face3Devices.map((d) => (
          <DeviceCard
            key={d.deviceUUID}
            device={d}
            onOpen={(device) =>
              /* 正在看这台就把实时画面带进详情页（见 face3Context） */
              navigate(face3DetailLocation(device, gManageDevice.companyDevices, masterDetail ? '/' : undefined), {
                state: carryFace3Live(device.deviceUUID),
              })
            }
            onWake={handleWake}
            isViewing={face3.liveUUID === (d.deviceUUID || '').toUpperCase()}
          />
        ))}
      </Box>
    </SesameFloatingAdd>
  );
}
