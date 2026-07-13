import React, { useContext, useMemo, useState } from 'react';
import MobileDeviceSetting from './MobileDeviceSetting';
import { Box, Divider, List, ListItem, ListItemText, Typography, Switch, SvgIcon, IconButton } from '@mui/material';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import MobileRemoveDevice from './MobileRemoveDevice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SvgArrow } from '@/assets/svg/svgLock';
import BatteryPercent from './biz/device/BatteryPercent';
import UpgradeFirmware from './biz/device/UpgradeFirmware';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { gConfig } from '@/constants/gConfig';
import { gUtils } from '@/utils/gUtils';
import MobileBindDevice from './MobileBindDevice';
import SliderItem from './SliderItem';

export default function DeviceSetting({ showBack = true }) {
  const { gStripe, gManageDevice, setSnackbarValue, gMediaType } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const did = searchParams.get('deviceUUID') || '';
  const deviceModel = searchParams.get('deviceModel') || '';
  const deviceName = searchParams.get('deviceName') || '';

  const currentDevice = useMemo(() => {
    return gManageDevice.companyDevices.find((item) => item.deviceUUID === did) || {};
  }, [gManageDevice.filteredSsmDevices, did]);

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
    return gUtils.isLockModel(deviceModel) ? (
      <>
        <ListItem onClick={onClickSetAngle}>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.SetAngle')} />
          <SvgIcon component={SvgArrow} />
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem onClick={onClickSetAngle}>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.LockWithOpenSensor')} />
          <Typography sx={{ color: 'text.secondary', mr: 1 }}>{''}</Typography>
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem onClick={onClickSetAngle}>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.AutoLockCountdown')} />
          <Switch
            checked={autoLockEnabled}
            onChange={onClickSetAngle}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: 'primary.main',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: 'primary.main',
              },
            }}
          />
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem onClick={onClickSetAngle}>
          <ListItemText primary={t('pages.sesameAccessControlDevice.index.SiriCustomPhrase')} />
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
      </>
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: gMediaType.isMobile ? 0 : 4,
            pt: 2,
          }}
        >
          <IconButton onClick={() => navigate(-1)} disableRipple>
            <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
            <Typography variant="h3" sx={{ color: 'black' }}>
              {deviceName}
            </Typography>
          </IconButton>
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
        {subFunctionsComp}
        <UpgradeFirmware device={currentDevice} Hub3DeviceUUID={currentDevice.stateInfo?.wm2UUID} />
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
        <Box sx={{ bgcolor: 'secondary.main', pl: 2, py: 0.5 }}>
          <Typography color="info.light" sx={{ lineHeight: '30px' }}>
            {t('pages.sesameAccessControlDevice.index.BindDeviceToHub3Hint', { deviceName: currentDevice.deviceName })}
          </Typography>
        </Box>
        <ListItem>
          <MobileBindDevice device={currentDevice} editable={false} />
        </ListItem>
        <Box sx={{ bgcolor: 'secondary.main', height: 10 }} />
        <MobileRemoveDevice
          deviceUUID={did}
          subUUID={gStripe.customerInfo.subUUID}
          deviceName={currentDevice.deviceName}
        />
      </List>
    </Box>
  );
}
