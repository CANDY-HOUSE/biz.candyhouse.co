import PageHeader from '@/components/PageHeader';
import BackButton from '@/components/BackButton';
import PeripheralDeviceSetting from './PeripheralDeviceSetting';
import { isPeripheralModel } from '@/services/peripheralSettings';
import { isBotModel, isScriptBotModel } from '@/services/botScripts';
import AppBotSettings from './AppBotSettings';
import { isAppLockModel } from '@/services/appLockSettings';
import { isAppHome } from '@/services/deviceService';
import LockSettingsExtras from './LockSettingsExtras';
import AppLockSettings from './AppLockSettings';
import React, { useContext, useMemo } from 'react';
import BleStatusBar from './BleStatusBar';
import MobileDeviceSetting from './MobileDeviceSetting';
import { Box, Divider, List, ListItem, ListItemText, Typography, SvgIcon, Switch } from '@mui/material';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import MobileRemoveDevice from './MobileRemoveDevice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SvgArrow } from '@/assets/svg/svgLock';
import BatteryPercent from './biz/device/BatteryPercent';
import UpgradeFirmware from './biz/device/UpgradeFirmware';
import { gConfig } from '@/constants/gConfig';
import { gUtils } from '@/utils/gUtils';
import SliderItem from './SliderItem';

export default function DeviceSetting(props) {
  const { gManageDevice } = useContext(GlobalStateContext);
  const [params] = useSearchParams();
  const id = params.get('deviceUUID');
  const model =
    gManageDevice.companyDevices.find((d) => d.deviceUUID?.toUpperCase() === id?.toUpperCase())?.deviceModel ||
    params.get('deviceModel');
  return isPeripheralModel(model) ? <PeripheralDeviceSetting {...props} /> : <ExistingDeviceSetting {...props} />;
}

function ExistingDeviceSetting({ showBack = true }) {
  const { gStripe, gManageDevice, setSnackbarValue, gMediaType } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const did = searchParams.get('deviceUUID') || '';
  const deviceModel =
    gManageDevice.companyDevices.find((item) => item.deviceUUID?.toUpperCase() === did.toUpperCase())?.deviceModel ||
    searchParams.get('deviceModel') ||
    '';
  const deviceName = searchParams.get('deviceName') || '';

  const currentDevice = useMemo(() => {
    return gManageDevice.companyDevices.find((item) => item.deviceUUID?.toUpperCase() === did.toUpperCase()) || {};
  }, [gManageDevice.companyDevices, did]);

  const onClickSetAngle = () => {
    setSnackbarValue({
      open: true,
      msg: 'Coming soon',
      severity: 'info',
    });
  };

  const openFactoryInfo = () => {
    const url = new URL(window.location.href);
    const newSearchParams = new URLSearchParams(url.searchParams);
    newSearchParams.set('deviceUUID', did);
    newSearchParams.set('deviceName', currentDevice.deviceName || deviceName);
    navigate({
      pathname: '/device-setting/factory-info',
      search: newSearchParams.toString(),
    });
  };

  const handleClickAuth = (type) => {
    let mstate = {
      title: deviceName,
      uuid: did,
    };
    let path = '';
    if (type === gConfig.sesameTouchProAuthType.card) {
      path = '/biz/access-control/cards';
    } else if (type === gConfig.sesameTouchProAuthType.password) {
      path = '/biz/access-control/passwords';
    }
    navigate(path, { state: mstate });
  };

  const subFunctionsComp = useMemo(() => {
    return gUtils.isLockModel(deviceModel) || isAppLockModel(deviceModel) ? (
      isAppHome && isAppLockModel(deviceModel) ? (
        <AppLockSettings key={`settings:${did}`} deviceUUID={did} device={currentDevice} />
      ) : !gStripe.isFromApp && isAppLockModel(deviceModel) ? (
        <>
          {['SetAngle', 'LockWithOpenSensor', 'AutoLockCountdown'].map((feature) => (
            <React.Fragment key={feature}>
              <ListItem onClick={onClickSetAngle} sx={{ cursor: 'pointer' }}>
                <ListItemText primary={t(`pages.sesameAccessControlDevice.index.${feature}`)} />
                {feature === 'SetAngle' && <SvgIcon component={SvgArrow} />}
                {feature === 'LockWithOpenSensor' && (
                  <Typography sx={{ color: '#999' }}>{t('lockSettings.immediate')}</Typography>
                )}
                {feature === 'AutoLockCountdown' && (
                  <Switch
                    checked={false}
                    inputProps={{ 'aria-label': t('pages.sesameAccessControlDevice.index.AutoLockCountdown') }}
                    onClick={(event) => event.stopPropagation()}
                    onChange={onClickSetAngle}
                  />
                )}
              </ListItem>
              <Divider variant="middle" sx={{ opacity: 0.4 }} />
            </React.Fragment>
          ))}
        </>
      ) : null
    ) : (
      <>
        {gUtils.isShowType(deviceModel, gConfig.sesameTouchProAuthType.card) && (
          <>
            <ListItem onClick={() => handleClickAuth(gConfig.sesameTouchProAuthType.card)}>
              <ListItemText primary={t('accessCtl.auth.manageCard')} />
              <SvgIcon component={SvgArrow} />
            </ListItem>
            <Divider variant="middle" sx={{ opacity: 0.4 }} />
          </>
        )}
        {gUtils.isShowType(deviceModel, gConfig.sesameTouchProAuthType.finger) && (
          <>
            <ListItem onClick={onClickSetAngle}>
              <ListItemText primary={t('accessCtl.auth.manageFingerprint')} />
              <SvgIcon component={SvgArrow} />
            </ListItem>
            <Divider variant="middle" sx={{ opacity: 0.4 }} />
          </>
        )}
        {gUtils.isShowType(deviceModel, gConfig.sesameTouchProAuthType.password) && (
          <>
            <ListItem onClick={() => handleClickAuth(gConfig.sesameTouchProAuthType.password)}>
              <ListItemText primary={t('accessCtl.auth.managePasscode')} />
              <SvgIcon component={SvgArrow} />
            </ListItem>
            <Divider variant="middle" sx={{ opacity: 0.4 }} />
          </>
        )}
        {gUtils.isShowType(deviceModel, gConfig.sesameTouchProAuthType.face) && (
          <>
            <ListItem onClick={onClickSetAngle}>
              <ListItemText primary={t('accessCtl.auth.manageFace')} />
              <SvgIcon component={SvgArrow} />
            </ListItem>
            <Divider variant="middle" sx={{ opacity: 0.4 }} />
          </>
        )}
        {gUtils.isShowType(deviceModel, gConfig.sesameTouchProAuthType.palm) && (
          <>
            <ListItem onClick={onClickSetAngle}>
              <ListItemText primary={t('accessCtl.auth.managePalmVeins')} />
              <SvgIcon component={SvgArrow} />
            </ListItem>
            <Divider variant="middle" sx={{ opacity: 0.4 }} />
          </>
        )}
      </>
    );
  }, [deviceModel, onClickSetAngle]);

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'auto',
        bgcolor: 'background.default',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {showBack && (
        <PageHeader sx={{ justifyContent: 'space-between', px: gMediaType.isMobile ? 0 : 4 }}>
          <BackButton onClick={() => navigate(-1)} disableRipple>
            <Typography variant="h3" sx={{ color: 'black' }}>
              {currentDevice.deviceName || deviceName}
            </Typography>
          </BackButton>
        </PageHeader>
      )}
      {isAppHome && <BleStatusBar deviceUUID={did} />}
      <List>
        <ListItem disablePadding>
          <MobileDeviceSetting />
        </ListItem>
        <Box sx={{ bgcolor: 'secondary.main', height: 10 }} />
        <ListItem>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.DeviceModel')} />
          <Typography sx={{ color: 'title.other' }}>{deviceModel}</Typography>
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        {isScriptBotModel(deviceModel) ? (
          isAppHome ? (
            <AppBotSettings deviceUUID={did} />
          ) : (
            <>
              <ListItem onClick={onClickSetAngle}>
                <ListItemText primary={t('botSettings.script')} />
              </ListItem>
              <Divider variant="middle" sx={{ opacity: 0.4 }} />
            </>
          )
        ) : (
          subFunctionsComp
        )}
        {(!gStripe.isFromApp || /iPhone|iPad|iPod/.test(navigator.userAgent)) &&
          !isAppHome &&
          isAppLockModel(deviceModel) && (
            <>
              <ListItem onClick={onClickSetAngle}>
                <ListItemText primary={t('pages.sesameAccessControlDevice.index.SiriCustomPhrase')} />
              </ListItem>
              <Divider variant="middle" sx={{ opacity: 0.4 }} />
            </>
          )}
        <UpgradeFirmware
          key={`firmware:${did}`}
          device={currentDevice}
          Hub3DeviceUUID={currentDevice.stateInfo?.wm2UUID}
        />
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <BatteryPercent device={currentDevice} />

        {currentDevice?.stateInfo?.registerTime && (
          <>
            <ListItem>
              <ListItemText primary={t('pages.sesameAccessControlDevice.index.RegisterTime')} />
              <Typography sx={{ color: 'title.other' }}>
                {new Date(Number(currentDevice.stateInfo.registerTime)).toLocaleString()}
              </Typography>
            </ListItem>
            <Divider variant="middle" sx={{ opacity: 0.4 }} />
          </>
        )}
        <ListItem onClick={openFactoryInfo} sx={{ cursor: 'pointer' }}>
          <ListItemText primary="UUID" />
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              maxWidth: 250,
              wordBreak: 'break-all',
            }}
          >
            {did}
          </Typography>
          <SvgIcon component={SvgArrow} />
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        {gUtils.isShowType(deviceModel, gConfig.sesameTouchProAuthType.face) && (
          <SliderItem text={t('accessCtl.auth.radarDetectionDistance')} value={0} onChangeCommitted={onClickSetAngle} />
        )}
        <Box sx={{ bgcolor: 'secondary.main', height: 10 }} />
        <MobileRemoveDevice
          deviceUUID={did}
          subUUID={gStripe.customerInfo.subUUID}
          deviceName={currentDevice.deviceName || deviceName}
          named={isAppLockModel(deviceModel) || isBotModel(deviceModel)}
        />
        {(isAppLockModel(deviceModel) || isBotModel(deviceModel)) && (
          <LockSettingsExtras key={`extras:${did}`} deviceUUID={did} autoUnlock={!isBotModel(deviceModel)} />
        )}
      </List>
    </Box>
  );
}
