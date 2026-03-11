import React, { useCallback, useContext, useEffect, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Box, List, ListItem, ListItemIcon, ListItemText, SvgIcon, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SvgArrow } from '@/assets/svg/svgLock';
import { QrCode } from '@mui/icons-material';
import { biz3utils } from '@/utils/biz3utils';
import { URLs } from '@/constants/URLs';

const MobileMeIndex = () => {
  const { t } = useTranslation();
  const { gStripe, gManageEmployee } = useContext(GlobalStateContext);
  const [currentUserInfo, setCurrentUserInfo] = useState({});
  const [notificationEnabled, setNotificationEnabled] = useState(null);

  const requestNotificationStatus = useCallback(() => {
    return new Promise((resolve, _reject) => {
      const requestId = Date.now().toString();
      window[`deviceListCallback_${requestId}`] = (deviceList) => {
        delete window[`deviceListCallback_${requestId}`];
        resolve(deviceList);
      };
      const timeout = setTimeout(() => {
        delete window[`deviceListCallback_${requestId}`];
      }, 10000);
      const message = {
        action: 'requestNotificationStatus',
        requestId: requestId,
        callbackName: `deviceListCallback_${requestId}`,
      };
      if (!biz3utils.triggerBridge(message)) {
        clearTimeout(timeout);
      }
    });
  }, []);

  const requestPushTokenFromApp = useCallback(() => {
    return new Promise((resolve, _reject) => {
      const requestId = Date.now().toString();
      window[`deviceListCallback_${requestId}`] = (deviceList) => {
        delete window[`deviceListCallback_${requestId}`];
        resolve(deviceList);
      };
      const timeout = setTimeout(() => {
        delete window[`deviceListCallback_${requestId}`];
      }, 10000);
      const message = {
        action: 'requestPushToken',
        requestId: requestId,
        callbackName: `deviceListCallback_${requestId}`,
      };
      if (!biz3utils.triggerBridge(message)) {
        clearTimeout(timeout);
      }
    });
  }, []);

  const fetchCurrentUserInfo = async () => {
    gManageEmployee.getCurrentUserInfo((res) => {
      setCurrentUserInfo(res.data);
    });
  };

  useEffect(() => {
    if (gStripe.customerInfo.isAnonymous) {
      return;
    }
    fetchCurrentUserInfo();

    requestNotificationStatus()
      .then((response) => {
        setNotificationEnabled(Boolean(response?.enabled));
      })
      .catch((error) => {
        console.error('Failed to get notification status:', error);
        setNotificationEnabled(null);
      });
  }, []);

  const handleOpenPage = ({ targetPath, link = '', notifyEnable = false, param = null }) => {
    var url = new URL(window.location.href);
    if (link) {
      url = new URL(link);
    } else {
      url.searchParams.delete('displayType');
      url.pathname = targetPath;
    }
    param &&
      Object.entries(param).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    const scheme = `ssm://UI/webview/open?${new URLSearchParams({
      url: url.toString(),
      ...(notifyEnable && { notifyName: 'UserProfileChanged' }),
    })}`;
    biz3utils.triggerScheme(scheme);
  };

  const handlePushPage = async () => {
    const pushInfo = await requestPushTokenFromApp();
    handleOpenPage({ targetPath: 'device-notify', param: pushInfo });
  };

  const handleHeaderClick = () => {
    if (gStripe.customerInfo.isAnonymous) {
      biz3utils.triggerBridge({
        action: 'requestLogin',
      });
    } else {
      handleOpenPage({ targetPath: 'me', notifyEnable: true });
    }
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      <List disablePadding>
        <ListItem onClick={handleHeaderClick} sx={{ height: '80px' }}>
          {gStripe.customerInfo.isAnonymous ? (
            <>
              <ListItemText
                primary={t('setting.loginRegist')}
                secondary={t('pages.sesameAccessControlDevice.index.Email')}
              />
            </>
          ) : (
            <>
              <ListItemText
                primary={currentUserInfo.nickname || currentUserInfo.email}
                secondary={currentUserInfo.email}
              />
              <ListItemIcon sx={{ minWidth: 'auto' }}>
                <QrCode sx={{ fontSize: 50, color: 'title.light' }} />
              </ListItemIcon>
            </>
          )}
        </ListItem>
        <ListItem onClick={handlePushPage}>
          <ListItemText
            primary={t('setting.enableNotification')}
            secondary={
              notificationEnabled == null
                ? null
                : notificationEnabled
                  ? t('setting.notificationEnabled')
                  : t('setting.notificationDisabled')
            }
            secondaryTypographyProps={{
              sx: {
                color: 'text.other',
                fontSize: '0.875rem',
              },
            }}
          />
          <ListItemIcon sx={{ minWidth: 'auto' }}>
            <SvgIcon component={SvgArrow} />
          </ListItemIcon>
        </ListItem>
        <ListItem onClick={() => handleOpenPage({ link: URLs.shop })}>
          <ListItemText primary={t('setting.shop')} />
          <Typography sx={{ color: 'title.other' }}>{''}</Typography>
          <ListItemIcon sx={{ minWidth: 'auto' }}>
            <SvgIcon component={SvgArrow} />
          </ListItemIcon>
        </ListItem>
      </List>
    </Box>
  );
};

export default MobileMeIndex;
