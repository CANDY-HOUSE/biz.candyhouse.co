import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, List, ListItem, ListItemText, ListItemIcon, Typography, SvgIcon, Divider } from '@mui/material';
import DeviceUserList from './DeviceUserList';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QrCode } from '@mui/icons-material';
import { SvgArrow } from '@/assets/svg/svgLock';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils';
import { GlobalStateContext } from '@/context/GlobalContextProvider';

const MobileDeviceSetting = () => {
  const { gStripe, gManageDevice } = useContext(GlobalStateContext);
  const DeviceMemberChangedName = 'DeviceMemberChanged';
  const [searchParams] = useSearchParams();
  const deviceUUID = searchParams.get('deviceUUID');
  const keyLevel = searchParams.get('keyLevel');
  const isWidget = searchParams.get('displayType') === 'widget';
  const [deviceName, setDeviceName] = useState('');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const lastHeightRef = useRef(null);

  const handleOpenPage = (targetPath) => {
    if (gStripe.isFromApp && isWidget) {
      const currentUrl = window.location.href;
      const url = new URL(currentUrl);
      url.searchParams.delete('displayType');
      url.searchParams.set('deviceName', deviceName);
      url.pathname = url.pathname.replace('/index', targetPath);
      const scheme = `ssm://UI/webview/open?${new URLSearchParams({
        notifyName: DeviceMemberChangedName,
        url: url.toString(),
      })}`;
      biz3utils.triggerScheme(scheme);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('displayType');
      url.searchParams.set('deviceName', deviceName);
      url.searchParams.set('notifyType', 'bridge');
      navigate({
        pathname: `/device-setting${targetPath}`,
        search: url.searchParams.toString(),
      });
    }
  };

  useEffect(() => {
    if (!deviceUUID) return;
    const device = gManageDevice.deviceStatus;
    if (device?.deviceName) {
      setDeviceName(device.deviceName);
    } else {
      gManageDevice.getDeviceStatus(deviceUUID);
    }
  }, [deviceUUID, gManageDevice.deviceStatus]);

  useLayoutEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const height = containerRef.current.offsetHeight;
    if (lastHeightRef.current !== height) {
      lastHeightRef.current = height;
      biz3utils.triggerBridge({
        action: 'requestAutoLayoutHeight',
        height,
      });
    }
  }, [gStripe.customerInfo.isAnonymous, deviceName]);

  return (
    <Box ref={containerRef} sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {!gStripe.customerInfo.isAnonymous && parseInt(keyLevel) < 2 && (
        <>
          <DeviceUserList deviceUUID={deviceUUID} />
          <Box sx={{ height: '10px', bgcolor: 'secondary.light', width: '100%' }} />
        </>
      )}
      <List disablePadding>
        <ListItem onClick={() => handleOpenPage('/rename')}>
          <ListItemText primary={t('deviceMember.editName')} />
          <Typography sx={{ color: 'title.other' }}>{deviceName}</Typography>
          <ListItemIcon sx={{ minWidth: 'auto' }}>
            <SvgIcon component={SvgArrow} />
          </ListItemIcon>
        </ListItem>
        {parseInt(keyLevel) < 2 && (
          <>
            <Divider variant="middle" sx={{ opacity: 0.4 }} />
            <ListItem onClick={() => handleOpenPage('/share')}>
              <ListItemText primary={t('deviceMember.shareManagement')} />
              <ListItemIcon sx={{ minWidth: 'auto' }}>
                <QrCode />
                <SvgIcon component={SvgArrow} />
              </ListItemIcon>
            </ListItem>
          </>
        )}
        <>
          <Divider variant="middle" sx={{ opacity: 0.4 }} />
          <ListItem>
            <ListItemText primary={t('deviceMember.permission')} />
            <Typography sx={{ color: 'title.other' }}>
              {parseInt(keyLevel) === 0
                ? t('deviceMember.role.owner')
                : parseInt(keyLevel) === 1
                  ? t('deviceMember.role.manager')
                  : t('deviceMember.role.guest')}
            </Typography>
          </ListItem>
        </>
      </List>
    </Box>
  );
};

export default MobileDeviceSetting;
