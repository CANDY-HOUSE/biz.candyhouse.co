import React, { useCallback, useContext, useEffect, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Box, List, ListItem, ListItemIcon, ListItemText, SvgIcon, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SvgArrow } from '@/assets/svg/svgLock';
import { QrCode } from '@mui/icons-material';
import { biz3utils } from '@/utils/biz3utils';
import { URLs } from '@/constants/URLs';
import ActionSheet from './ActionSheet';

const MobileMyHomepage = () => {
  const { t } = useTranslation();
  const { gStripe, gManageEmployee } = useContext(GlobalStateContext);
  const [currentUserInfo, setCurrentUserInfo] = useState({});
  const [notificationEnabled, setNotificationEnabled] = useState(null);
  const [activePromotion, setActivePromotion] = useState(null);
  const [authState, setAuthState] = useState(null); // { signedIn, state }
  const [appVersion, setAppVersion] = useState(null); // { display, downloadURL, ... }
  const [actionSheet, setActionSheet] = useState(null); // { title, onConfirm }

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

  // 登录态查询（native bridge）
  const requestAuthState = useCallback(() => {
    return new Promise((resolve) => {
      const requestId = Date.now().toString();
      const cb = `requestAuthState_${requestId}`;
      window[cb] = (res) => {
        delete window[cb];
        resolve(res);
      };
      const timeout = setTimeout(() => {
        delete window[cb];
        resolve(null);
      }, 10000);
      if (!biz3utils.triggerBridge({ action: 'requestAuthState', requestId, callbackName: cb })) {
        clearTimeout(timeout);
        delete window[cb];
        resolve(null);
      }
    });
  }, []);

  // 版本号查询（native bridge）
  const requestAppVersion = useCallback(() => {
    return new Promise((resolve) => {
      const requestId = Date.now().toString();
      const cb = `requestAppVersion_${requestId}`;
      window[cb] = (res) => {
        delete window[cb];
        resolve(res);
      };
      const timeout = setTimeout(() => {
        delete window[cb];
        resolve(null);
      }, 10000);
      if (!biz3utils.triggerBridge({ action: 'requestAppVersion', requestId, callbackName: cb })) {
        clearTimeout(timeout);
        delete window[cb];
        resolve(null);
      }
    });
  }, []);

  // 登出（native bridge；确认交互由 H5 actionSheet 处理，native 只执行登出）
  const requestSignOut = useCallback(() => {
    return new Promise((resolve) => {
      const requestId = Date.now().toString();
      const cb = `requestSignOut_${requestId}`;
      window[cb] = (res) => {
        delete window[cb];
        resolve(res);
      };
      if (!biz3utils.triggerBridge({ action: 'requestSignOut', requestId, callbackName: cb })) {
        delete window[cb];
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

  // 登录态 + 版本号（native bridge）
  useEffect(() => {
    requestAuthState().then((res) => res && setAuthState(res));
    requestAppVersion().then((res) => res && setAppVersion(res));
  }, [requestAuthState, requestAppVersion]);

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
      handleLogin();
    } else {
      handleOpenPage({ targetPath: 'me', notifyEnable: true });
    }
  };

  // 登录：URL 由 H5 给出，app 负责跳转
  const handleLogin = () => {
    biz3utils.triggerBridge({
      action: 'requestLogin',
      url: `${window.location.origin}/login`,
    });
  };

  // 确认后执行登出
  const doSignOut = async () => {
    const res = await requestSignOut();
    if (res?.success) setAuthState({ signedIn: false, state: 'signedOut' });
  };

  const handleLogout = () => setActionSheet({ title: t('setting.logout'), onConfirm: doSignOut });
  const handleDeleteAccount = () => setActionSheet({ title: t('setting.deleteAccount'), onConfirm: doSignOut });

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
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
                  primary={currentUserInfo.name || currentUserInfo.email}
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
          <ListItem onClick={handleShopClick}>
            <ListItemText
              primary={
                <Box component="span" sx={{ position: 'relative', display: 'inline-block', pr: '24px' }}>
                  {t('setting.shop')}
                  {activePromotion?.visible && (
                    <Box
                      component="span"
                      sx={{
                        position: 'absolute',
                        top: '-4px',
                        right: '2px',
                        width: '20px',
                        height: '20px',
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
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ textAlign: 'center', color: 'rgba(0,0,25,0.22)' }}>{authState?.state ?? ''}</Typography>
        <Typography
          onClick={() =>
            biz3utils.triggerBridge({
              action: 'requestOpenExternalURL',
              url: 'https://testflight.apple.com/join/Rok4GOFD',
            })
          }
          sx={{ textAlign: 'center', pb: 2, color: 'rgba(0,0,25,0.22)' }}
        >
          {appVersion?.display ?? ''}
        </Typography>
      </Box>

      {authState?.signedIn && (
        <>
          <Box
            onClick={handleLogout}
            sx={{
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#F2F2F7',
              fontSize: '15px',
              color: '#000',
              cursor: 'pointer',
            }}
          >
            {t('setting.logout')}
          </Box>
          <Box sx={{ height: '500px' }} />
          <Box
            onClick={handleDeleteAccount}
            sx={{
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#F2F2F7',
              fontSize: '15px',
              color: '#000',
              cursor: 'pointer',
            }}
          >
            {t('setting.deleteAccount')}
          </Box>
        </>
      )}
      <ActionSheet
        open={!!actionSheet}
        title={actionSheet?.title}
        onConfirm={() => {
          const confirm = actionSheet?.onConfirm;
          setActionSheet(null);
          confirm && confirm();
        }}
        onClose={() => setActionSheet(null)}
      />
    </Box>
  );
};

export default MobileMyHomepage;
