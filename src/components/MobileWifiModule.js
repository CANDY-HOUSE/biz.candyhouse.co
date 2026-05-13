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
  Typography,
} from '@mui/material';
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CheckCircleOutline, Error, Language, QrCode, Remove, Wifi, SignalCellularAlt } from '@mui/icons-material';
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
  const { gManageDevice, setSnackbarValue, gIot, gMediaType, gStripe } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const did = searchParams.get('deviceUUID') || '';
  const isFromApp = searchParams.get('fromType') === 'app';
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
  const [internetSetting, setInternetSetting] = useState(null);
  const [LEDBrightness, setLEDBrightness] = useState(0);
  const [isRequestMatter, setIsRequestMatter] = useState(false);
  const [isWifiConnected, setIsWifiConnected] = useState(false);
  const [isLTEConnected, setIsLTEConnected] = useState(false);
  const [isHub3LTE, setIsHub3LTE] = useState(false);
  const { t } = useTranslation();

  const currentDevice = useMemo(() => {
    return gManageDevice.companyDevices.find((item) => item.deviceUUID === did) || {};
  }, [gManageDevice.filteredSsmDevices, did]);

  useEffect(() => {
    if (!currentDevice.secretKey) {
      return;
    }
    let isIoTWrok = currentDevice.stateInfo?.wm2State === true;
    setInternetStatus({
      isAPWork: isIoTWrok,
      isNetwork: isIoTWrok,
      isIoTWork: isIoTWrok,
      isBindingAPWork: false,
      isConnectingNetwork: false,
      isConnectingIoT: false,
    });
    setInternetSetting({
      wifiSsid: currentDevice.stateInfo?.wifiSsid,
      wifiPwd: currentDevice.stateInfo?.wifiPwd,
    });
    setIsWifiConnected(currentDevice.stateInfo?.wifiConnected ?? false);
    setIsLTEConnected(currentDevice.stateInfo?.lteConnected ?? false);
    console.log('Current device info updated:', currentDevice);
    setIsHub3LTE(currentDevice.deviceModel === 'hub_3_lte');
  }, [currentDevice]);

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
        setInternetSetting({ wifiSsid, wifiPwd });
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

  const requestNetworkTypeFromApp = useCallback(() => {
    const requestId = Date.now().toString();
    window[`deviceListCallback_${requestId}`] = (data) => {
      const op = data['op'];
      if (op === 'onNetworkType') {
        const { isWifiConnected, isLTEConnected } = data;
        setIsWifiConnected(isWifiConnected);
        setIsLTEConnected(isLTEConnected);
      }
    };
    biz3utils.triggerBridge({
      action: 'requestNetworkType',
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
    return bleStatus['bleStatus'] !== 'logined' && isFromApp;
  }, [bleStatus, isFromApp]);

  useLayoutEffect(() => {
    isFromApp && did && requestEnablePullRefresh();
    // 尝试连接 BLE
    isFromApp && did && requestBLEConnectFromApp({ deviceUUID: did });
  }, []);

  const bleAvailable = useMemo(() => {
    return bleStatus && bleStatus['bleStatus'] === 'logined';
  }, [bleStatus]);

  useEffect(() => {
    if (!bleAvailable) return;
    // 监听配网变化
    requestMonitorInternetFromApp();
    requestNetworkTypeFromApp();
  }, [bleAvailable]);

  const internetStatusIndicator = useMemo(() => {
    const { isAPWork, isNetwork, isIoTWork, isBindingAPWork, isConnectingNetwork, isConnectingIoT } = internetStatus;
    const renderIcon = (IconComponent, isLoading, isActive, step1, customSx = {}) => (
      <Box key={IconComponent.name} sx={{ display: 'flex', alignItems: 'center', ...customSx }}>
        <Box sx={{ width: 25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isLoading ? (
            <CircularProgress size={14} sx={{ color: 'primary.main' }} />
          ) : !!step1 ? (
            <></>
          ) : (
            <Remove sx={{ color: isActive ? 'primary.main' : 'title.other' }} />
          )}
        </Box>
        <IconComponent
          sx={{
            color: isActive ? 'primary.main' : 'title.other',
          }}
        />
      </Box>
    );

    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {isHub3LTE ? (
          <>
            {/* 有 lte/wifi 字段：两者都显示，根据各自状态高亮 */}
            {renderIcon(SignalCellularAlt, false, isLTEConnected, true, { marginRight: -2.5 })}
            {renderIcon(Wifi, false, isWifiConnected, true)}
          </>
        ) : (
          <>{renderIcon(Wifi, isAPWork ? false : isBindingAPWork, isAPWork, true)}</>
        )}
        {renderIcon(Language, isNetwork ? false : isConnectingNetwork, isNetwork)}
        {renderIcon(CheckCircleOutline, isIoTWork ? false : isConnectingIoT, isIoTWork)}
      </Box>
    );
  }, [internetStatus, isWifiConnected, isLTEConnected, isHub3LTE]);

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
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
        <ListItem onClick={() => requestConfigureInternetFromApp(did)}>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {t('pages.sesameAccessControlDevice.index.WiFiSSID')}
                {internetSetting && !internetSetting.wifiSsid && (
                  <ListItemIcon sx={{ minWidth: 'auto', color: 'error.main' }}>
                    <Error />
                  </ListItemIcon>
                )}
              </Box>
            }
          />
          <Typography sx={{ color: 'title.other' }}>{internetSetting?.wifiSsid}</Typography>
          {internetSetting && internetSetting.wifiSsid && isHub3LTE && (
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
          <Typography sx={{ color: 'title.other' }}>{internetSetting?.wifiPwd}</Typography>
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.InternetStatus')} />
          {internetStatusIndicator}
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
        <ListItem>
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
        </ListItem>
        <Box sx={{ bgcolor: 'secondary.main', height: 10 }} />
        <ListItem onClick={isRequestMatter ? null : handleOpenMatter}>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.Matter')} />
          <ListItemIcon sx={{ minWidth: 'auto', justifyContent: 'center', display: 'flex', alignItems: 'center' }}>
            {isRequestMatter ? <CircularProgress size={16} sx={{ color: 'title.other' }} /> : <QrCode />}
            <SvgIcon component={SvgArrow} />
          </ListItemIcon>
        </ListItem>
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
