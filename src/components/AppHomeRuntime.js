import { isBotModel, isScriptBotModel } from '@/services/botScripts';
import { appPromotion } from '@/services/appPromotion';
import { appOperation } from '@/services/appOperations';
import { migrateDeviceOrder } from '@/services/deviceOrderMigration';
import { isPeripheralModel } from '@/services/peripheralSettings';
import usePeripheralSettings from '@/hooks/usePeripheralSettings';
import { setEnvId } from '@/utils/envIdentity';
import { guestDevices, rememberGuestDevices, forgetGuestDevice } from '@/services/guestDevices';
import { useTranslation } from 'react-i18next';
import { gConfig } from '@/constants/gConfig';
import { cloudCallback } from '@/services/cloudCallback';
import { useContext, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { deviceService, isAppHome } from '@/services/deviceService';
import { onNativeEvent, requestNative, notifyNative } from '@/services/appBridge';
import { currentAppToken, isGuestAppSession } from '@/services/appSession';
import { modelNameByProductType } from '@/constants/sesameDeviceModel';
import { qrMode } from '@/constants/qrType';
import WebSocketManager, { WS_STATUS } from '@/websocket/WebSocketManager.ts';
import { appTabPaths, currentAppTab, rememberAppTab } from '@/services/appNavigation';

export default function AppHomeRuntime() {
  const navigate = useNavigate();
  const background = new URLSearchParams(window.location.search).get('background') === '1';
  const { t } = useTranslation();
  const location = useLocation();
  const context = useContext(GlobalStateContext);
  const current = useRef({ context, location });
  current.current = { context, location };
  const settingParams = new URLSearchParams(location.search);
  const settingId = settingParams.get('deviceUUID');
  const settingModel =
    context.gManageDevice.companyDevices.find((d) => d.deviceUUID?.toUpperCase() === settingId?.toUpperCase())
      ?.deviceModel || settingParams.get('deviceModel');
  // The parent setting and credentials page own their watches. Keep the same BLE connection across other child pages.
  const peripheralChild =
    location.pathname.startsWith('/device-setting/') &&
    location.pathname !== '/device-setting/credentials' &&
    isPeripheralModel(settingModel);
  usePeripheralSettings(peripheralChild ? settingId : undefined, settingModel === 'wm_2');
  useEffect(() => {
    if (!isAppHome || background) return;
    appPromotion.clear();
    const account = context.gStripe.customerInfo.subUUID;
    if (!account) return;
    const refresh = () => appPromotion.refresh(account).catch(() => {});
    refresh();
    const offStatus = WebSocketManager.onStatusChange((status) => {
      if (status === WS_STATUS.CONNECTED) refresh();
    });
    const offNative = onNativeEvent(({ type }) => {
      if (type === 'resume' || type === 'push') refresh();
    });
    return () => {
      offStatus();
      offNative();
      appPromotion.clear();
    };
  }, [context.gStripe.customerInfo.subUUID]);
  const tabIndex = useRef(null);
  const orderMigrationRefreshed = useRef(new Set());
  const loadingAccount = useRef(false);
  useEffect(() => {
    if (!isAppHome) return;
    if (context.gAuth.loginState === gConfig.loginState.loginOut) {
      loadingAccount.current = false;
      deviceService.notify('devices', { devices: [] });
      return;
    }
    if (
      context.gAuth.loginState === gConfig.loginState.login &&
      !context.gStripe.customerInfo.companyID &&
      !loadingAccount.current
    ) {
      loadingAccount.current = true;
      context.gStripe.getCustomerInfo('ch_CandyhouseMobile');
    }
  }, [context.gAuth.loginState, context.gStripe.customerInfo.companyID]);
  useEffect(() => {
    if (!isAppHome) return;
    const go = (target, replace = false) => {
      const url = new URL(target, window.location.origin);
      if (url.origin !== window.location.origin) {
        requestNative('openWebPage', { url: url.href }).catch(showError);
        return;
      }
      url.searchParams.set('appHome', '1');
      url.searchParams.set('fromType', 'app');
      url.searchParams.delete('token');
      navigate({ pathname: url.pathname, search: url.search }, { replace });
    };
    const back = () => {
      const path = current.current.location.pathname;
      const index = window.history.state?.idx ?? 0;
      if (path === '/app/register' || path === '/login') go(currentAppTab(), true);
      else if (index > (tabIndex.current ?? 0)) navigate(-1);
      else go(currentAppTab(), true);
    };
    const showError = (error) =>
      current.current.context.setSnackbarValue({
        logScope: 'components/AppHomeRuntime.showError',
        severity: 'error',
        open: true,
        msg: error.message || String(error),
      });
    const showNotice = (msg) => current.current.context.setSnackbarValue({ open: true, msg, severity: 'warning' });
    const refresh = async () => {
      const ctx = current.current.context;
      if (ctx.gAuth.loginState !== gConfig.loginState.login) return;
      try {
        const token = await currentAppToken();
        WebSocketManager.connect(token);
        ctx.gManageDevice.getCompanyDevices(true);
        if (!isGuestAppSession() && ctx.gStripe.customerInfo.isAnonymous === false) {
          ctx.gManageEmployee.getEmployees();
        }
      } catch (error) {
        showError(error);
      }
    };
    let scanCallback;
    const scan = (value) => {
      const ctx = current.current.context;
      try {
        const url = new URL(value);
        const friend = url.searchParams.get(qrMode.QR_FRIEND);
        if (url.searchParams.get('t') === qrMode.QR_FRIEND && friend) {
          if (isGuestAppSession() || ctx.gStripe.customerInfo.isAnonymous) {
            showNotice(t('appHome.loginRequired'));
            return;
          }
          ctx.gManageEmployee.addEmployee(
            [{ friendID: friend.toLowerCase(), companyID: ctx.gStripe.customerInfo.companyID }],
            (response) => {
              if (!response.success) showError(response.message || 'Unable to add contact');
              else {
                ctx.gManageEmployee.getEmployees();
                go('/contacts');
              }
            }
          );
          return;
        }
        if (url.searchParams.get('t') !== 'sk' || !url.searchParams.get('sk')) throw new Error();
      } catch (_) {
        showNotice(t('appHome.unsupportedQr'));
        return;
      }
      ctx.gManageGroup.redeemQRToken(value, (response) => {
        if (!response.success) {
          showError(response.message || 'QR redemption failed');
          return;
        }
        // Redemption now binds the device on the server; only inspect the model for navigation.
        let model;
        try {
          const redeemed = new URL(response.data);
          const payload = redeemed.searchParams.get('sk')?.replace(/ /g, '+');
          model = modelNameByProductType[atob(payload).charCodeAt(0)];
        } catch (_) {
          // Invalid responses must not trigger a second client-side binding request.
        }
        if (!model) {
          showNotice(t('appHome.unsupportedQr'));
          return;
        }
        ctx.gManageDevice.getCompanyDevices(true);
        if (model === gConfig.sesameDeviceModel.sesame_face_3) {
          ctx.gFace3.listFace3Devices();
          go('/vision');
        } else go('/');
      });
    };
    const unsubscribe = onNativeEvent(({ type, data }) => {
      if (type === 'cloudRequest') {
        if (data.op === 'widgetCommand') {
          const device = current.current.context.gManageDevice.companyDevices.find(
            (item) => item.deviceUUID.toUpperCase() === data.deviceUUID?.toUpperCase()
          );
          const operation = data.body?.operation;
          if (!device || !['toggle', 'lock', 'unlock'].includes(operation)) {
            notifyNative('cloudResponse', { requestId: data.requestId, success: false });
            return;
          }
          current.current.context.gIot
            .sendCommandToWM2({
              device_id: device.deviceUUID,
              sescretKey: device.secretKey,
              cmd: isScriptBotModel(device.deviceModel)
                ? 170 + Number(device.stateInfo?.scriptList?.find((row) => row.isDefault === 1)?.actionIndex || 0)
                : isBotModel(device.deviceModel)
                  ? 89
                  : operation === 'lock'
                    ? 82
                    : operation === 'unlock'
                      ? 83
                      : 88,
            })
            .then(() => notifyNative('cloudResponse', { requestId: data.requestId, success: true }))
            .catch(() => notifyNative('cloudResponse', { requestId: data.requestId, success: false }));
          return;
        }
        const allowed = ['registerOs2', 'registerOs3', 'signGuestKey', 'history', 'firmware', 'battery'];
        if (!allowed.includes(data.op)) {
          notifyNative('cloudResponse', { requestId: data.requestId, success: false });
          return;
        }
        appOperation(data.op, data.body, { deviceUUID: data.deviceUUID })
          .then((result) => notifyNative('cloudResponse', { requestId: data.requestId, success: true, data: result }))
          .catch(() => notifyNative('cloudResponse', { requestId: data.requestId, success: false }));
      } else if (type === 'snapshot') deviceService.receiveSnapshot(data);
      else if (type === 'discovery') deviceService.receiveDiscovery(data);
      else if (type === 'navigate') go(data);
      else if (type === 'back') back();
      else if (type === 'resume' || type === 'push') refresh();
      else if (type === 'qrCancelled') scanCallback = null;
      else if (type === 'qr') {
        const callback = window[scanCallback];
        scanCallback = null;
        if (typeof callback === 'function') callback(data);
        else scan(data);
      } else if (type === 'error') showError(data);
    });
    const scheme = ({ detail }) => {
      try {
        const uri = new URL(detail);
        if (uri.pathname === '/webview/open') go(uri.searchParams.get('url'));
        else if (uri.pathname === '/webview/notify') refresh();
      } catch (error) {
        showError(error);
      }
    };
    const command = ({ detail: message }) => {
      const callback = (response) => window[message.callbackName]?.(response);
      switch (message.action) {
        case 'requestScanQRCode':
          scanCallback = message.callbackName;
          requestNative('scanQr').catch(showError);
          break;
        case 'requestLogin':
          go('/login');
          break;
        case 'requestSignOut':
          current.current.context.gAuth.handleSignout(callback);
          break;
        case 'requestRefreshApp':
          refresh();
          callback({ success: true });
          break;
        case 'requestDestroySelf':
          back();
          break;
        case 'requestOpenExternalURL':
          requestNative('external', { url: message.url }).catch(showError);
          break;
        case 'requestAppVersion':
          requestNative('appVersion')
            .then((result) => callback(result.data))
            .catch(showError);
          break;
        case 'requestPushToken':
        case 'requestNotificationStatus':
          requestNative('pushInfo')
            .then((result) => callback(result.data))
            .catch((error) => {
              callback({ success: false });
              showError(error);
            });
          break;
        case 'requestNotificationSettings':
          requestNative('notificationSettings').catch(showError);
          break;
        case 'requestActivePromotion':
          appPromotion
            .refresh(current.current.context.gStripe.customerInfo.subUUID)
            .then((promotion) => callback({ success: true, ...promotion }))
            .catch(() => callback({ success: false }));
          break;
        case 'requestMarkPromotionRead':
          appPromotion
            .markRead(message.promotionId, message.targetUrl)
            .then((promotion) => callback({ success: true, ...promotion }))
            .catch(() => callback({ success: false }));
          break;
        case 'requestAuthState':
          callback({
            success: true,
            signedIn: current.current.context.gAuth.loginState === gConfig.loginState.login && !isGuestAppSession(),
          });
          break;
        default:
          callback({ success: false, error: 'This capability is not available in the web app yet' });
      }
    };
    window.addEventListener('app-scheme', scheme);
    window.addEventListener('app-command', command);
    deviceService.notify('ready');
    return () => {
      unsubscribe();
      window.removeEventListener('app-scheme', scheme);
      window.removeEventListener('app-command', command);
    };
  }, [navigate, t]);
  useEffect(() => {
    if (!isAppHome) return;
    const params = new URLSearchParams(location.search);
    if (params.get('appHome') !== '1' || params.get('fromType') !== 'app') {
      params.set('appHome', '1');
      params.set('fromType', 'app');
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);
  useEffect(() => {
    if (!isAppHome || background || !context.gStripe.customerInfo.subUUID) return;
    let active = true;
    let running = false;
    let retry;
    let attempts = 0;
    const account = context.gStripe.customerInfo.subUUID;
    const guest = context.gStripe.customerInfo.isAnonymous === true;
    const sameAccount = () =>
      active && current.current.context.gStripe.customerInfo.subUUID === account && isGuestAppSession() === guest;
    const syncPush = async () => {
      if (running || !sameAccount()) return;
      running = true;
      clearTimeout(retry);
      try {
        const { data } = await requestNative('pushInfo');
        if (!sameAccount()) return;
        if (!guest) await appOperation('bindPush', data.pushToken, { account });
        if (!sameAccount()) return;
        const response = await appOperation(
          'subscribePush',
          {
            action: 'subscribeToTopic',
            topicName: 'app_announcements',
            pushToken: data.pushToken,
            appIdentifyId: data.appIdentifyId,
            platform: 'android',
            env: data.env,
          },
          { account, language: data.language }
        );
        const result = typeof response?.body === 'string' ? JSON.parse(response.body) : response;
        if (!result?.success || !result.envId) throw new Error('Push subscription failed');
        if (!sameAccount()) return;
        setEnvId(result.envId);
        current.current.context.gStripe.setCustomerInfo((previous) =>
          previous.subUUID === account ? { ...previous, envId: result.envId } : previous
        );
        attempts = 0;
      } catch (_) {
        if (sameAccount()) {
          if (++attempts < 3) retry = setTimeout(syncPush, attempts * 5000);
          else
            current.current.context.setSnackbarValue({
              logScope: 'components/AppHomeRuntime.syncPush',
              logReason: 'appHome.networkError',
              severity: 'error',
              open: true,
              msg: t('appHome.networkError'),
            });
        }
      } finally {
        running = false;
      }
    };
    const retryPush = () => {
      attempts = 0;
      syncPush();
    };
    syncPush();
    const off = onNativeEvent(({ type }) => {
      if (type === 'resume' || type === 'push') retryPush();
    });
    window.addEventListener('online', retryPush);
    return () => {
      active = false;
      clearTimeout(retry);
      off();
      window.removeEventListener('online', retryPush);
    };
  }, [context.gStripe.customerInfo.subUUID, context.gStripe.customerInfo.isAnonymous, t]);
  const uploading = useRef(false);
  useEffect(() => {
    if (!isAppHome || !context.gManageDevice.devicesLoaded || !context.gStripe.customerInfo.companyID) return;
    const account = context.gStripe.customerInfo.subUUID;
    const guest = context.gStripe.customerInfo.isAnonymous === true;
    if (guest && isGuestAppSession()) rememberGuestDevices(account, context.gManageDevice.companyDevices);
    let active = true;
    const sameAccount = () =>
      current.current.context.gStripe.customerInfo.subUUID === account &&
      current.current.context.gAuth.loginState === gConfig.loginState.login &&
      isGuestAppSession() === guest;
    const sync = async () => {
      if (!active || uploading.current || !sameAccount() || current.current.location.pathname === '/app/register')
        return;
      uploading.current = true;
      try {
        const { data: keys } = await requestNative('localKeys');
        for (const key of keys) {
          if (!sameAccount()) return;
          await cloudCallback((cb) => current.current.context.gManageDevice.addSesameDevicesToBiz3([key], cb));
          if (!sameAccount()) return;
          await requestNative('keysUploaded', { deviceUUID: key.deviceUUID });
        }
        if (keys.length && sameAccount()) current.current.context.gManageDevice.getCompanyDevices(true);
        if (guest || !sameAccount()) return;
        const migrations = guestDevices().filter((item) => item.target === account && item.subUUID !== account);
        for (const source of new Set(migrations.map((item) => item.subUUID))) {
          const items = migrations.filter((item) => item.subUUID === source);
          const payload = [];
          for (const item of items) {
            if (!sameAccount()) return;
            const { data: key } = await requestNative('deviceKey', { deviceUUID: item.deviceUUID });
            payload.push({ ...key, deviceName: item.deviceName, keyLevel: item.keyLevel, orderKey: item.orderKey });
          }
          if (!sameAccount()) return;
          // The socket adapter reuses the old upload Lambda and confirms guest cleanup before acknowledging.
          const uploaded = [];
          for (let offset = 0; offset < payload.length; offset += 20) {
            if (!sameAccount()) return;
            const result = await appOperation('uploadKeys', payload.slice(offset, offset + 20), {
              account,
              guestIdentityId: source,
            });
            uploaded.push(...(result?.uploaded || []));
          }
          if (!sameAccount()) return;
          if (!payload.every((key) => uploaded.includes(key.deviceUUID.toUpperCase())))
            throw new Error('Device migration not confirmed');
          items.forEach(forgetGuestDevice);
          current.current.context.gManageDevice.getCompanyDevices(true);
        }
      } catch (error) {
        if (sameAccount())
          current.current.context.setSnackbarValue({
            logScope: 'components/AppHomeRuntime.sync',
            logReason: 'appHome.networkError',
            severity: 'error',
            open: true,
            msg: t('appHome.networkError'),
          });
      } finally {
        uploading.current = false;
        if (!active) window.dispatchEvent(new Event('app-keys-sync'));
      }
    };
    sync();
    const off = onNativeEvent(({ type }) => {
      if (type === 'resume') sync();
    });
    window.addEventListener('online', sync);
    window.addEventListener('app-keys-sync', sync);
    return () => {
      active = false;
      off();
      window.removeEventListener('online', sync);
      window.removeEventListener('app-keys-sync', sync);
    };
  }, [
    context.gManageDevice.devicesLoaded,
    context.gManageDevice.companyDevices,
    context.gStripe.customerInfo.companyID,
    context.gStripe.customerInfo.subUUID,
    context.gStripe.customerInfo.isAnonymous,
    location.pathname,
  ]);
  useEffect(() => {
    if (!isAppHome) return;
    if (appTabPaths.includes(location.pathname)) {
      rememberAppTab(location.pathname);
      tabIndex.current = window.history.state?.idx ?? 0;
    }
    deviceService.notify('route', { path: location.pathname });
  }, [location.pathname]);
  useEffect(() => {
    if (!isAppHome || !context.gManageDevice.devicesLoaded) return;
    let active = true;
    const account = context.gStripe.customerInfo.subUUID;
    deviceService
      .request('devices', {
        devices: context.gManageDevice.companyDevices,
        historyTag: context.gStripe.customerInfo.envId,
      })
      .then(() => {
        if (active && current.current.context.gStripe.customerInfo.subUUID === account)
          return migrateDeviceOrder(account);
        return false;
      })
      .then((migrated) => {
        if (
          migrated &&
          current.current.context.gStripe.customerInfo.subUUID === account &&
          !orderMigrationRefreshed.current.has(account)
        ) {
          orderMigrationRefreshed.current.add(account);
          current.current.context.gManageDevice.getCompanyDevices(true);
        }
      })
      .catch(() => {
        /* Retry on the next successfully received list; do not mark a failed migration. */
      });
    return () => {
      active = false;
    };
  }, [
    context.gManageDevice.companyDevices,
    context.gManageDevice.devicesLoaded,
    context.gStripe.customerInfo.envId,
    context.gStripe.customerInfo.subUUID,
  ]);
  return null;
}
