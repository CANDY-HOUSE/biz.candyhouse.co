import { appPromotion } from '@/services/appPromotion';
import { appDistributesApk, onNativeEvent } from '@/services/appBridge';
import { isAppHome } from '@/services/deviceService';
import { appTabBarHeight, appTabTopBarHeight, appTopBarHeight } from '@/services/appNavigation';
import React, { useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import {
  Avatar,
  Box,
  ButtonBase,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  SvgIcon,
  Typography,
} from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { ios } from '@/theme/appHomeStyle';
import { useTranslation } from 'react-i18next';
import { SvgArrow } from '@/assets/svg/svgLock';
import { QrCode } from '@mui/icons-material';
import { biz3utils } from '@/utils/biz3utils';
import { URLs } from '@/constants/URLs';
import ActionSheet from './ActionSheet';

const appCardSx = { bgcolor: ios.card, borderRadius: ios.cardRadius, overflow: 'hidden' };

const appRowSx = {
  position: 'relative',
  width: '100%',
  minHeight: 56,
  justifyContent: 'flex-start',
  gap: '14px',
  pl: '16px',
  pr: '12px',
  py: '10px',
  transition: 'background-color 0.2s ease',
  '&:active': { bgcolor: '#E5E5EA' },
  '&:not(:last-of-type)::after': {
    content: '""',
    position: 'absolute',
    left: 60,
    right: 0,
    bottom: 0,
    height: '0.5px',
    bgcolor: ios.separator,
  },
};

const AppRow = ({ icon, iconBg, title, subtitle, dot, onClick }) => (
  <ButtonBase onClick={onClick} sx={appRowSx}>
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: '8px',
        bgcolor: iconBg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        '& svg': { fontSize: 20 },
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Typography sx={{ fontSize: 17, color: ios.label }}>{title}</Typography>
        {dot && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f44336', flexShrink: 0 }} />}
      </Box>
      {subtitle && <Typography sx={{ mt: '1px', fontSize: 13, color: ios.secondaryLabel }}>{subtitle}</Typography>}
    </Box>
    <KeyboardArrowRightIcon sx={{ fontSize: 22, color: ios.tertiaryLabel, flexShrink: 0 }} />
  </ButtonBase>
);

const AppActionRow = ({ title, color, onClick }) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      ...appRowSx,
      justifyContent: 'center',
      '&:not(:last-of-type)::after': { ...appRowSx['&:not(:last-of-type)::after'], left: 16 },
    }}
  >
    <Typography sx={{ fontSize: 17, color }}>{title}</Typography>
  </ButtonBase>
);

const MobileMyHomepage = () => {
  const { t } = useTranslation();
  const { gStripe, gManageEmployee } = useContext(GlobalStateContext);
  const currentUserInfo = gManageEmployee.currentUserProfile;
  const [notificationEnabled, setNotificationEnabled] = useState(null);
  const [legacyPromotion, setActivePromotion] = useState(null);
  const webPromotion = useSyncExternalStore(appPromotion.subscribe, appPromotion.getSnapshot);
  const activePromotion = isAppHome ? webPromotion : legacyPromotion;
  const [authState, setAuthState] = useState(null); // { signedIn, state }
  const [appVersion, setAppVersion] = useState(null); // { display, downloadURL, ... }
  const [actionSheet, setActionSheet] = useState(null); // { title, onConfirm }

  const requestNotificationStatus = useCallback(() => {
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      window[`deviceListCallback_${requestId}`] = (deviceList) => {
        clearTimeout(timeout);
        delete window[`deviceListCallback_${requestId}`];
        resolve(deviceList);
      };
      const timeout = setTimeout(() => {
        delete window[`deviceListCallback_${requestId}`];
        reject(new Error('Notification status timed out'));
      }, 10000);
      const message = {
        action: 'requestNotificationStatus',
        requestId: requestId,
        callbackName: `deviceListCallback_${requestId}`,
      };
      if (!biz3utils.triggerBridge(message)) {
        clearTimeout(timeout);
        delete window[`deviceListCallback_${requestId}`];
        reject(new Error('Notification status unavailable'));
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
        clearTimeout(timeout);
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
        clearTimeout(timeout);
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
    gManageEmployee.getCurrentUserInfo(undefined, true);
  };

  const { getCurrentUserInfo } = gManageEmployee;
  useEffect(() => {
    if (!isAppHome) return;
    let active = true;
    const apply = (setter) => (value) => {
      if (active && value && value.success !== false) setter(value);
    };
    const unsubscribe = onNativeEvent(({ type }) => {
      if (type !== 'resume') return;
      // Preserve the last known state if a background refresh fails.
      requestAuthState()
        .then(apply(setAuthState))
        .catch(() => {});
      requestAppVersion()
        .then(apply(setAppVersion))
        .catch(() => {});
      requestNotificationStatus()
        .then(apply((response) => setNotificationEnabled(Boolean(response.enabled))))
        .catch(() => {});
      if (!gStripe.customerInfo.isAnonymous) {
        getCurrentUserInfo(undefined, true);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    gStripe.customerInfo.subUUID,
    gStripe.customerInfo.isAnonymous,
    getCurrentUserInfo,
    requestAuthState,
    requestAppVersion,
    requestNotificationStatus,
  ]);

  useEffect(() => {
    if (isAppHome) return;
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
    if (!gStripe.customerInfo.isAnonymous) fetchCurrentUserInfo();

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
    if (isAppHome) handleOpenPage({ targetPath: 'device-notify' });
    else {
      const pushInfo = await requestPushTokenFromApp();
      handleOpenPage({ targetPath: 'device-notify', param: pushInfo });
    }
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

  const handleShopClick = async () => {
    const targetUrl = activePromotion?.targetUrl || URLs.shop;
    if (activePromotion?.promotionId && activePromotion.visible) {
      setActivePromotion({
        ...activePromotion,
        visible: false,
      });
      if (isAppHome) {
        // Finish the request before an external page replaces this WebView document.
        await appPromotion.markRead(activePromotion.promotionId, targetUrl).catch(() => {});
      } else requestMarkPromotionRead(activePromotion.promotionId, targetUrl);
    }
    handleOpenPage({ link: targetUrl });
  };

  const openAppDownload = () => {
    let url = 'https://testflight.apple.com/join/Rok4GOFD';
    if (appDistributesApk || window.AndroidHandler) {
      url =
        'https://github.com/CANDY-HOUSE/SesameSDK_Android_with_DemoApp/releases/latest/download/Sesame_android_release.apk';
    }
    biz3utils.triggerBridge({
      action: 'requestOpenExternalURL',
      url,
    });
  };

  const notificationText =
    notificationEnabled == null
      ? null
      : notificationEnabled
        ? t('setting.notificationEnabled')
        : t('setting.notificationDisabled');

  const actionSheetView = (
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
  );

  if (isAppHome) {
    const anonymous = gStripe.customerInfo.isAnonymous;
    const displayName = currentUserInfo.name || currentUserInfo.email;
    return (
      <Box sx={{ px: '16px', pt: '8px', pb: '16px' }}>
        {/* Fills the first screen so, as before, logout and account deletion only show after scrolling. */}
        <Box
          sx={{
            minHeight: `calc(100dvh - ${appTabTopBarHeight + 8}px - env(safe-area-inset-bottom))`,
            pb: `${appTabBarHeight}px`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ButtonBase
            onClick={handleHeaderClick}
            sx={{
              ...appCardSx,
              width: '100%',
              justifyContent: 'flex-start',
              gap: '16px',
              px: '16px',
              py: '16px',
              transition: 'background-color 0.2s ease',
              '&:active': { bgcolor: '#E5E5EA' },
            }}
          >
            <Avatar
              sx={{
                width: 62,
                height: 62,
                background: 'linear-gradient(180deg, #A5ABB8 0%, #858994 100%)',
                color: '#fff',
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {anonymous || !displayName ? (
                <PersonOutlineIcon sx={{ fontSize: 34 }} />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <Typography
                sx={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: ios.label,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {anonymous ? t('setting.loginRegist') : displayName}
              </Typography>
              <Typography
                sx={{
                  mt: '2px',
                  fontSize: 15,
                  color: ios.secondaryLabel,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {anonymous ? t('pages.sesameAccessControlDevice.index.Email') : currentUserInfo.email}
              </Typography>
            </Box>
            {anonymous ? (
              <KeyboardArrowRightIcon sx={{ fontSize: 22, color: ios.tertiaryLabel, flexShrink: 0 }} />
            ) : (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: ios.fill,
                  color: ios.label,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <QrCode sx={{ fontSize: 22 }} />
              </Box>
            )}
          </ButtonBase>
          <Box sx={{ ...appCardSx, mt: '24px' }}>
            <AppRow
              icon={<NotificationsRoundedIcon />}
              iconBg="#FF3B30"
              title={t('setting.enableNotification')}
              subtitle={notificationText}
              onClick={handlePushPage}
            />
            <AppRow
              icon={<StorefrontRoundedIcon />}
              iconBg={ios.tint}
              title={t('setting.shop')}
              dot={activePromotion?.visible}
              onClick={handleShopClick}
            />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Typography
            onClick={openAppDownload}
            sx={{ mt: '28px', textAlign: 'center', fontSize: 13, color: ios.secondaryLabel }}
          >
            {appVersion?.display ?? ''}
          </Typography>
        </Box>
        {authState?.signedIn && (
          <>
            <Box sx={{ height: '300px' }} />
            <Box sx={appCardSx}>
              <AppActionRow title={t('setting.logout')} color={ios.tint} onClick={handleLogout} />
            </Box>
            <Box sx={{ height: '800px' }} />
            <Box sx={appCardSx}>
              <AppActionRow title={t('setting.deleteAccount')} color={ios.red} onClick={handleDeleteAccount} />
            </Box>
          </>
        )}
        {actionSheetView}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      <Box
        sx={{
          // The app header row sits inside the viewport, above the tab content.
          minHeight: isAppHome ? `calc(100dvh - 64px - ${appTopBarHeight}px - env(safe-area-inset-bottom))` : '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <List disablePadding>
          <ListItem onClick={handleHeaderClick} sx={{ height: '80px' }}>
            {gStripe.customerInfo.isAnonymous ? (
              <>
                <ListItemText
                  primary={t('setting.loginRegist')}
                  secondary={t('pages.sesameAccessControlDevice.index.Email')}
                  primaryTypographyProps={{
                    sx: { fontWeight: 'bold' },
                  }}
                />
              </>
            ) : (
              <>
                <ListItemText
                  primary={currentUserInfo.name || currentUserInfo.email}
                  secondary={currentUserInfo.email}
                  primaryTypographyProps={{
                    sx: { fontWeight: 'bold' },
                  }}
                />
                <ListItemIcon sx={{ minWidth: 'auto' }}>
                  <QrCode sx={{ fontSize: 50, color: 'title.light' }} />
                </ListItemIcon>
              </>
            )}
          </ListItem>
          {
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
          }
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
                        width: '16px',
                        height: '16px',
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
        <Typography onClick={openAppDownload} sx={{ textAlign: 'center', pb: 2, color: 'rgba(0,0,25,0.22)' }}>
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
      {actionSheetView}
    </Box>
  );
};

export default MobileMyHomepage;
