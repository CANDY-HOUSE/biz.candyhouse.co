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
  const [activePromotion, setActivePromotion] = useState(null);

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

  const requestActivePromotion = useCallback(() => {
    return new Promise((resolve, _reject) => {
      const requestId = Date.now().toString();
      window[`promotionCallback_${requestId}`] = (promotion) => {
        clearTimeout(timeout);
        delete window[`promotionCallback_${requestId}`];
        resolve(promotion);
      };
      const timeout = setTimeout(() => {
        delete window[`promotionCallback_${requestId}`];
        resolve(null);
      }, 10000);
      const message = {
        action: 'requestActivePromotion',
        requestId: requestId,
        callbackName: `promotionCallback_${requestId}`,
      };
      if (!biz3utils.triggerBridge(message)) {
        clearTimeout(timeout);
        delete window[`promotionCallback_${requestId}`];
        resolve(null);
      }
    });
  }, []);

  const requestMarkPromotionRead = useCallback((promotionId, targetUrl) => {
    return new Promise((resolve, _reject) => {
      const requestId = Date.now().toString();
      window[`promotionCallback_${requestId}`] = (promotion) => {
        clearTimeout(timeout);
        delete window[`promotionCallback_${requestId}`];
        resolve(promotion);
      };
      const timeout = setTimeout(() => {
        delete window[`promotionCallback_${requestId}`];
        resolve(null);
      }, 10000);
      const message = {
        action: 'requestMarkPromotionRead',
        requestId: requestId,
        callbackName: `promotionCallback_${requestId}`,
        promotionId,
        targetUrl,
      };
      if (!biz3utils.triggerBridge(message)) {
        clearTimeout(timeout);
        delete window[`promotionCallback_${requestId}`];
        resolve(null);
      }
    });
  }, []);

  const fetchCurrentUserInfo = async () => {
    gManageEmployee.getCurrentUserInfo((res) => {
      setCurrentUserInfo(res.data);
    });
  };

  useEffect(() => {
    requestActivePromotion()
      .then((promotion) => {
        if (promotion?.success) {
          setActivePromotion(promotion);
        }
      })
      .catch(() => {
        setActivePromotion(null);
      });
  }, []);

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

  const handleShopClick = () => {
    const targetUrl = activePromotion?.targetUrl || URLs.shop;
    if (activePromotion?.promotionId && activePromotion.visible) {
      setActivePromotion({
        ...activePromotion,
        visible: false,
      });
      requestMarkPromotionRead(activePromotion.promotionId, targetUrl);
    }
    handleOpenPage({ link: targetUrl });
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
              <ListItemText primary={currentUserInfo.name || currentUserInfo.email} secondary={currentUserInfo.email} />
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
        <ListItem onClick={handleShopClick}>
          <ListItemText
            primary={
              <Box component="span" sx={{ position: 'relative', display: 'inline-block', pr: '10px' }}>
                {t('setting.shop')}
                {activePromotion?.visible && (
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      top: '2px',
                      right: 0,
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      bgcolor: '#f44336',
                    }}
                  />
                )}
              </Box>
            }
          />
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
