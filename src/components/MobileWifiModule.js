import PageHeader from '@/components/PageHeader';
import BackButton from '@/components/BackButton';
import WifiNetworkStatus from './WifiNetworkStatus';
import PeripheralDeviceSetting from './PeripheralDeviceSetting';
import AppHubWifi from './AppHubWifi';
import { deviceDetailFor } from '@/services/deviceDetail';
import { deviceService, isAppHome } from '@/services/deviceService';
import BleStatusBar from './BleStatusBar';
import MobileDeviceSetting from '@/components/MobileDeviceSetting';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import {
  Box,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  SvgIcon,
  Switch,
  Typography,
} from '@mui/material';
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Error, QrCode } from '@mui/icons-material';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import { SvgArrow } from '@/assets/svg/svgLock';
import MobileHub3RemoteList from '@/components/MobileHub3RemoteList';
import MobileBindDevice from '@/components/MobileBindDevice';
import { gConfig } from '@/constants/gConfig';
import { registerIotCallback } from '@/hooks/useIotCallbackRegistry';
import { biz3utils } from '@/utils/biz3utils';
import MobileQRCodeDialog from '@/components/MobileQRCodeDialog';
import UpgradeFirmware from '@/components/biz/device/UpgradeFirmware';
import MobileRemoveDevice from '@/components/MobileRemoveDevice';
import BatteryPercent from '@/components/biz/device/BatteryPercent';
import SliderItem from '@/components/SliderItem';

const MobileWifiModule = () => {
  const { gManageDevice } = useContext(GlobalStateContext);
  const [params] = useSearchParams();
  const id = params.get('deviceUUID');
  const model =
    gManageDevice.companyDevices.find((d) => d.deviceUUID?.toUpperCase() === id?.toUpperCase())?.deviceModel ||
    params.get('deviceModel');
  return model === 'wm_2' ? <PeripheralDeviceSetting /> : <ExistingWifiModule />;
};

const ExistingWifiModule = () => {
  const { gManageDevice, setSnackbarValue, gIot, gMediaType, gStripe } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const did = searchParams.get('deviceUUID') || '';
  const isFromApp = searchParams.get('fromType') === 'app';
  const nativeDevices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const nativeDevice = nativeDevices[did.toUpperCase()];
  const hubReady = !!nativeDevice;
  const [wifiOpen, setWifiOpen] = useState(false);
  const [watchedHub, setWatchedHub] = useState('');
  useEffect(() => {
    // Registration can navigate here before the refreshed device list reaches the native controller.
    if (!isAppHome || !did || !hubReady) return;
    const session = crypto.randomUUID();
    let watching = false;
    // StrictMode setup/cleanup must not connect, disconnect, then reconnect the Hub.
    const start = setTimeout(() => {
      watching = true;
      deviceService
        .request('hubSettings', { deviceUUID: did, operation: 'watch', session })
        .then(() => {
          if (watching) setWatchedHub(did);
        })
        .catch(() => {
          if (watching)
            setSnackbarValue({
              logScope: 'components/MobileWifiModule.start',
              logReason: 'lockSettings.failed',
              open: true,
              msg: t('lockSettings.failed'),
              severity: 'error',
            });
        });
    }, 0);
    return () => {
      clearTimeout(start);
      if (watching) deviceService.notify('hubSettings', { deviceUUID: did, operation: 'unwatch', session });
      watching = false;
    };
  }, [did, hubReady]);
  useEffect(() => {
    if (!isAppHome || watchedHub !== did || !nativeDevice?.bleConnected) return;
    // One scan per connection; the drawer reuses these results, including an in-flight scan.
    const start = setTimeout(() => {
      deviceService.request('hubSettings', { deviceUUID: did, operation: 'scan' }).catch(() => {});
    }, 0);
    return () => clearTimeout(start);
  }, [did, watchedHub, nativeDevice?.bleConnected]);
  const [matterInfo, setMatterInfo] = useState({ manualCode: '', qrCode: '' });
  const [bleStatus, setBleStatus] = useState(null);
  const [internetStatus, setInternetStatus] = useState({
    isAPWork: false,
    isNetwork: false,
    isIoTWork: false,
    isBindingAPWork: false,
    isConnectingNetwork: false,
    isConnectingIoT: false,
  });
  const [LEDBrightness, setLEDBrightness] = useState(0);
  const [isRequestMatter, setIsRequestMatter] = useState(false);
  const [networkConnectivity, setNetworkConnectivity] = useState({ wifi: false, lte: false, ethernet: false });
  const [relayEnable, setRelayEnable] = useState({ enable1: true, enable2: true });
  const [isHub3Pro, setIsHub3Pro] = useState(searchParams.get('deviceModel') === gConfig.sesameDeviceModel.hub3_pro);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openFactoryInfo = () => {
    const url = new URL(window.location.href);
    const newSearchParams = new URLSearchParams(url.searchParams);
    newSearchParams.set('deviceUUID', did);
    newSearchParams.set('deviceName', currentDevice.deviceName || '');
    navigate({
      pathname: '/device-setting/factory-info',
      search: newSearchParams.toString(),
    });
  };

  const currentDevice = useMemo(() => {
    return deviceDetailFor(did, gManageDevice.deviceStatus, gManageDevice.companyDevices);
  }, [did, gManageDevice.deviceStatus, gManageDevice.companyDevices]);

  useEffect(() => {
    gManageDevice.getDeviceStatus(did);
  }, [did, gManageDevice.getDeviceStatus]);

  // 来自 App 时 URL 没有 deviceModel，需要等后台返回 device 后才能确定设备类型，
  // 在确定之前不要渲染网络图标，避免先显示单 WiFi 再跳到 LAN/LTE/WiFi 的闪动。
  const isDeviceInfoResolved = useMemo(() => {
    if (!isFromApp) return true;
    return !!currentDevice.deviceModel;
  }, [isFromApp, currentDevice.deviceModel]);

  useEffect(() => {
    if (!currentDevice.secretKey) {
      return;
    }
    setNetworkConnectivity({
      wifi: currentDevice.stateInfo?.wifiConnected ?? false,
      lte: currentDevice.stateInfo?.lteConnected ?? false,
      ethernet: currentDevice.stateInfo?.ethernetConnected ?? false,
    });
    // 继电器使能：缺省视为已使能（添加设备时后台已写 enable=1，旧设备缺省也按开启兜底）
    const relayInfo = currentDevice.stateInfo?.relayInfo || {};
    setRelayEnable({
      enable1: relayInfo.enable1 === undefined ? true : Number(relayInfo.enable1) === 1,
      enable2: relayInfo.enable2 === undefined ? true : Number(relayInfo.enable2) === 1,
    });
    setIsHub3Pro(currentDevice.deviceModel === gConfig.sesameDeviceModel.hub3_pro);
  }, [currentDevice]);

  useEffect(() => {
    if (!isAppHome || !nativeDevice?.bleConnected || !nativeDevice.hub) return;
    const hub = nativeDevice.hub;
    if (hub.network) setInternetStatus(hub.network);
    if (
      hub.wifiSsid !== undefined &&
      (hub.wifiSsid !== currentDevice.stateInfo?.wifiSsid ||
        (hub.wifiPwd || '') !== (currentDevice.stateInfo?.wifiPwd || ''))
    )
      gManageDevice.updateDeviceState({
        deviceUUID: currentDevice.deviceUUID || did,
        stateInfo: { wifiSsid: hub.wifiSsid, wifiPwd: hub.wifiPwd || '' },
      });
  }, [nativeDevice]);

  // 切换某一路继电器使能，乐观更新本地并写入后台 relay_info
  const handleToggleRelayEnable = useCallback(
    (relayIndex, value) => {
      setRelayEnable((prev) => ({ ...prev, [`enable${relayIndex}`]: value }));
      gManageDevice.updateRelayEnable({
        deviceUUID: did,
        [`enable${relayIndex}`]: value ? 1 : 0,
      });
    },
    [did, gManageDevice]
  );

  useEffect(() => {
    if (isAppHome && nativeDevice?.bleConnected && nativeDevice.hub?.network) return;
    let isIoTWork = currentDevice.stateInfo?.wm2State === true;
    setInternetStatus((prev) => ({
      ...prev,
      isAPWork: isIoTWork,
      isNetwork: isIoTWork,
      isIoTWork: isIoTWork,
    }));
  }, [currentDevice.stateInfo?.wm2State, nativeDevice?.bleConnected]);

  // 通知Hub3打开配网窗口，成功显示 Matter 码， 失败显示失败信息
  const handleOpenMatter = useCallback(() => {
    setIsRequestMatter(true);
    gIot.sendCommandToHub3WithConnectionId({
      device_id: did,
      cmd: gConfig.cmdCode.HUB3_MATTER_PAIRING_CODE,
      secretKey: currentDevice.secretKey,
    });
    const timeout = setTimeout(() => {
      setIsRequestMatter(false);
    }, 10000);
    registerIotCallback(gConfig.cmdCode.HUB3_MATTER_PAIRING_CODE, (iotDeviceUUID, data) => {
      console.log('[HUB3_MATTER_PAIRING_CODE]', did, iotDeviceUUID, data);
      if (iotDeviceUUID !== did || !data) return;
      console.log('Fetched Matter QR Code and Manual Code from device:', data.qrCode, data.manualCode);
      const { manualCode, qrCode } = data;
      gIot.sendCommandToHub3WithConnectionId({
        device_id: did,
        cmd: gConfig.cmdCode.HUB3_MATTER_PAIRING_WINDOW,
        secretKey: currentDevice.secretKey,
      });
      registerIotCallback(gConfig.cmdCode.HUB3_MATTER_PAIRING_WINDOW, (iotDeviceUUID, data) => {
        console.log('[HUB3_MATTER_PAIRING_WINDOW]', iotDeviceUUID, data);
        setIsRequestMatter(false);
        clearTimeout(timeout);
        if (iotDeviceUUID !== did) return;
        // 根据 statusCode 在UI上显示不同内容， 打开配网窗口成功显示二维码， 否则显示失败信息
        if (data.statusCode === 0) {
          biz3utils.writeQrcode(qrCode, (ins) => {
            if (ins) {
              const url = ins.toDataURL(10, 0);
              console.log('QR code URL:', url);
              setMatterInfo({
                manualCode,
                qrCode: url,
              });
            }
          });
        } else {
          setSnackbarValue({
            open: true,
            severity: 'error',
            logScope: 'MobileWifiModule.matterPairingWindow',
            msg: 'Hub3がすでに多数のMatterネットワークに接続されている可能性があります。Hub3をリセットしてから再試行してください。',
          });
        }
      });
    });
  }, [currentDevice]);

  const handleChangeLEDBrightness = useCallback(
    (newValue) => {
      // 转为 0-255 范围, 传给 Hub3
      const ledDuty = new Uint8ClampedArray([(newValue * 255) / 100.0])[0];
      gIot.sendCommandToHub3WithConnectionId({
        device_id: did,
        cmd: gConfig.cmdCode.HUB3_ITEM_CODE_LED_DUTY,
        secretKey: currentDevice.secretKey,
        iotPayload: {
          op: gConfig.hub3LedDutyOp.set,
          duty: ledDuty,
        },
      });
    },
    [currentDevice]
  );

  const handleClearWiFiSSID = useCallback(() => {
    gIot.sendCommandToHub3WithConnectionId({
      device_id: did,
      cmd: gConfig.cmdCode.HUB3_ITEM_CODE_CLEAR_WIFI_SSID,
      secretKey: currentDevice.secretKey,
      iotPayload: {},
    });
  }, [currentDevice, did]);

  const getLEDBrightness = () => {
    gIot.sendCommandToHub3WithConnectionId({
      device_id: did,
      cmd: gConfig.cmdCode.HUB3_ITEM_CODE_LED_DUTY,
      secretKey: currentDevice.secretKey,
      iotPayload: {
        op: gConfig.hub3LedDutyOp.get,
        duty: 100,
      },
    });
    registerIotCallback(gConfig.cmdCode.HUB3_ITEM_CODE_LED_DUTY, (iotDeviceUUID, data) => {
      console.log('[HUB3_ITEM_CODE_LED_DUTY]', iotDeviceUUID, data);
      if (data.ledDuty) {
        const dutyPercent = Math.round((data.ledDuty / 255) * 100);
        console.log('Updated LED duty from device:', dutyPercent);
        setLEDBrightness(dutyPercent);
      }
    });
  };

  useEffect(() => {
    if (!currentDevice.secretKey) return;
    getLEDBrightness();
  }, [currentDevice.secretKey]);

  const requestBLEConnectFromApp = useCallback(({ deviceUUID }) => {
    const requestId = Date.now().toString();
    window[`deviceListCallback_${requestId}`] = (data) => {
      setBleStatus(data);
    };
    biz3utils.triggerBridge({
      action: 'requestBLEConnect',
      requestId: requestId,
      callbackName: `deviceListCallback_${requestId}`,
      deviceUUID,
    });
  }, []);

  const requestMonitorInternetFromApp = useCallback(() => {
    const requestId = Date.now().toString();
    window[`deviceListCallback_${requestId}`] = (data) => {
      const op = data['op'];
      if (op === 'onAPSettingChanged') {
        const { wifiSsid, wifiPwd } = data;
        gManageDevice.updateDeviceState({
          deviceUUID: did,
          stateInfo: {
            wifiSsid,
            wifiPwd,
          },
        });
      } else if (op === 'onMechStatus') {
        // eslint-disable-next-line
        const { op, ...others } = data;
        setInternetStatus(others);
      }
    };
    biz3utils.triggerBridge({
      action: 'requestMonitorInternet',
      requestId: requestId,
      callbackName: `deviceListCallback_${requestId}`,
    });
  }, []);

  const requestConfigureInternetFromApp = useCallback(({ deviceUUID }) => {
    const requestId = Date.now().toString();
    biz3utils.triggerBridge({
      action: 'requestConfigureInternet',
      requestId: requestId,
      deviceUUID,
    });
  }, []);

  const requestEnablePullRefresh = useCallback(() => {
    biz3utils.triggerBridge({
      action: 'requestEnablePullRefresh',
    });
  }, []);

  const handleDeleteWifiClick = useCallback(
    (e) => {
      e.stopPropagation();
      handleClearWiFiSSID();
    },
    [handleClearWiFiSSID]
  );

  const showBleStatus = useMemo(() => {
    if (!bleStatus) {
      return false;
    }
    return !isAppHome && !!bleStatus['bleStatus'] && bleStatus['bleStatus'] !== 'logined' && isFromApp;
  }, [bleStatus, isFromApp]);

  useLayoutEffect(() => {
    if (isAppHome) return;
    isFromApp && did && requestEnablePullRefresh();
    // 尝试连接 BLE
    isFromApp && did && requestBLEConnectFromApp({ deviceUUID: did });
  }, []);

  const bleAvailable = useMemo(() => {
    return isAppHome ? !!nativeDevice?.bleConnected : bleStatus && bleStatus['bleStatus'] === 'logined';
  }, [bleStatus, nativeDevice?.bleConnected]);

  useEffect(() => {
    if (isAppHome || !bleAvailable) return;
    // 监听配网变化
    requestMonitorInternetFromApp();
  }, [bleAvailable]);

  return (
    <Box
      data-refresh-disabled={nativeDevice?.hub?.otaProgress >= 0 && nativeDevice?.hub?.otaProgress < 100}
      sx={{
        height: '100dvh',
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {isAppHome && (
        <PageHeader>
          <BackButton onClick={() => navigate(-1)} disableRipple aria-label={t('lockSettings.back')}></BackButton>
        </PageHeader>
      )}
      {isAppHome && <BleStatusBar deviceUUID={did} />}
      {showBleStatus && (
        <Box
          sx={{
            bgcolor: 'error.main',
            p: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          <Typography>{bleStatus['bleStatus']}</Typography>
        </Box>
      )}
      <List>
        <ListItem disablePadding>
          <MobileDeviceSetting />
        </ListItem>
        <Box sx={{ bgcolor: 'secondary.main', height: 10 }} />
        <ListItem>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.DeviceModel')} />
          <Typography sx={{ color: 'title.other' }}>{currentDevice.deviceModel}</Typography>
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem
          onClick={() => {
            if (isAppHome) {
              if (!bleAvailable) {
                setSnackbarValue({
                  logScope: 'components/MobileWifiModule.ExistingWifiModule',
                  logReason: 'lockSettings.failed',
                  open: true,
                  msg: t('lockSettings.failed'),
                  severity: 'error',
                });
                return;
              }
              setWifiOpen(true);
              // The native scan gate reuses an active scan or results less than 30 seconds old.
              deviceService.request('hubSettings', { deviceUUID: did, operation: 'scan' }).catch(() =>
                setSnackbarValue({
                  logScope: 'components/MobileWifiModule.ExistingWifiModule',
                  logReason: 'lockSettings.failed',
                  open: true,
                  msg: t('lockSettings.failed'),
                  severity: 'error',
                })
              );
            } else requestConfigureInternetFromApp({ deviceUUID: did });
          }}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {t('pages.sesameAccessControlDevice.index.WiFiSSID')}
                {currentDevice.stateInfo && !currentDevice.stateInfo?.wifiSsid && (
                  <ListItemIcon sx={{ minWidth: 'auto', color: 'error.main' }}>
                    <Error />
                  </ListItemIcon>
                )}
              </Box>
            }
          />
          <Typography sx={{ color: 'title.other' }}>{currentDevice.stateInfo?.wifiSsid}</Typography>
          {currentDevice.stateInfo?.wifiSsid && isHub3Pro && (
            <ListItemIcon
              onClick={handleDeleteWifiClick}
              sx={{
                minWidth: 'auto',
                color: 'title.other',
                mr: -1,
                p: 1,
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              <ClearOutlinedIcon fontSize="medium" />
            </ListItemIcon>
          )}
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.WiFiPWD')} />
          <Typography sx={{ color: 'title.other' }}>{currentDevice.stateInfo?.wifiPwd}</Typography>
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.InternetStatus')} />
          <WifiNetworkStatus
            status={internetStatus}
            resolved={isDeviceInfoResolved}
            hub3Pro={isHub3Pro}
            connectivity={networkConnectivity}
          />
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <UpgradeFirmware device={currentDevice} bleAvailable={bleAvailable} />
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <SliderItem
          text={t('pages.sesameAccessControlDevice.index.LED')}
          value={LEDBrightness}
          onChangeCommitted={(val) => handleChangeLEDBrightness(val)}
        />
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <BatteryPercent device={currentDevice} />
        {currentDevice?.stateInfo?.registerTime && (
          <ListItem>
            <ListItemText primary={t('pages.sesameAccessControlDevice.index.RegisterTime')} />
            <Typography sx={{ color: 'title.other' }}>
              {new Date(Number(currentDevice.stateInfo.registerTime)).toLocaleString()}
            </Typography>
          </ListItem>
        )}
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem onClick={openFactoryInfo} sx={{ cursor: 'pointer' }}>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.UUID')} />
          <Typography
            sx={{
              color: 'title.other',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
              minWidth: 0,
            }}
          >
            {did}
          </Typography>
          <SvgIcon component={SvgArrow} />
        </ListItem>
        <Box sx={{ bgcolor: 'secondary.main', height: 10 }} />
        {/* Hub3 Pro 隐藏 Matter 栏；其它机型仍显示 */}
        {!isHub3Pro && (
          <ListItem onClick={isRequestMatter ? null : handleOpenMatter}>
            <ListItemText primary={t('pages.sesameAccessControlDevice.index.Matter')} />
            <ListItemIcon sx={{ minWidth: 'auto', justifyContent: 'center', display: 'flex', alignItems: 'center' }}>
              {isRequestMatter ? <CircularProgress size={16} /> : <QrCode />}
              <SvgIcon component={SvgArrow} />
            </ListItemIcon>
          </ListItem>
        )}
        {/* 继电器使能：放在 Matter 栏之后 */}
        {isHub3Pro && (
          <>
            <ListItem>
              <ListItemText primary={t('pages.sesameAccessControlDevice.index.EnableRelay1')} />
              <Switch
                edge="end"
                checked={relayEnable.enable1}
                onChange={(e) => handleToggleRelayEnable(1, e.target.checked)}
              />
            </ListItem>
            <Divider variant="middle" sx={{ opacity: 0.4 }} />
            <ListItem>
              <ListItemText primary={t('pages.sesameAccessControlDevice.index.EnableRelay2')} />
              <Switch
                edge="end"
                checked={relayEnable.enable2}
                onChange={(e) => handleToggleRelayEnable(2, e.target.checked)}
              />
            </ListItem>
            <Divider variant="middle" sx={{ opacity: 0.4 }} />
          </>
        )}
        <Box sx={{ bgcolor: 'secondary.main', pl: 2, py: 0.5 }}>
          <Typography color="info.light" sx={{ lineHeight: '30px' }}>
            {t('pages.sesameAccessControlDevice.index.BindDeviceToHub3Hint', { deviceName: 'Hub3' })}
          </Typography>
        </Box>
        <ListItem sx={{ py: 0 }}>
          <MobileBindDevice device={currentDevice} />
        </ListItem>
        <Box sx={{ bgcolor: 'secondary.main', pl: 2, py: 0.5 }}>
          <Typography color="info.light" sx={{ lineHeight: '30px' }}>
            {t('pages.sesameAccessControlDevice.index.BindIRToHub3Hint')}
          </Typography>
        </Box>
        <ListItem sx={{ py: 0 }}>
          <MobileHub3RemoteList deviceUUID={did} />
        </ListItem>
      </List>
      <Box sx={{ bgcolor: 'secondary.main', height: 10 }} />
      <MobileRemoveDevice
        deviceUUID={did}
        subUUID={gStripe.customerInfo.subUUID}
        deviceName={currentDevice?.deviceName}
      />
      {wifiOpen && <AppHubWifi deviceUUID={did} onClose={() => setWifiOpen(false)} />}
      <MobileQRCodeDialog
        onClose={() => {
          setMatterInfo({ qrCode: '', manualCode: '' });
        }}
        open={matterInfo.qrCode}
        qrCodeUrl={matterInfo.qrCode}
        isMobile={gMediaType.isMobile}
        userName={matterInfo.manualCode}
        title={`${t('pages.sesameAccessControlDevice.index.MatterPairingHint')}`}
        subtitle=" "
      />
    </Box>
  );
};

export default MobileWifiModule;
