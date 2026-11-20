import { isAppLockModel } from '@/services/appLockSettings';
import { isAppHome } from '@/services/deviceService';
import { gUtils } from '@/utils/gUtils';
import { createSearchParams, useNavigate } from 'react-router-dom';

export const deviceDetailPath = (device) => {
  const isAppGuest = isAppHome && Number(device.keyLevel) === 2;
  // Bot 1 keeps no device history; open its settings directly.
  if (isAppHome && device.deviceModel === 'ssmbot_1') return '/device-setting';
  if (gUtils.isLockModel(device.deviceModel) || isAppLockModel(device.deviceModel)) {
    return isAppGuest ? '/device-setting' : '/biz/devices/list-item';
  }
  if (isAppGuest && gUtils.isOPSModel(device.deviceModel)) return '/device-setting';
  if (gUtils.isWifiModel(device.deviceModel)) return '/biz/wifi-module/index';
  return '/biz/access-control/region';
};

export const useNavigateUtils = () => {
  const navigate = useNavigate();

  const navigateToDeviceDetail = (device) => {
    if (!device) return;
    const path = deviceDetailPath(device);
    navigate({
      pathname: path,
      search: createSearchParams({
        ...(isAppHome ? { appHome: '1', fromType: 'app' } : {}),
        deviceUUID: device.deviceUUID,
        keyLevel: device.keyLevel,
        deviceModel: device.deviceModel,
        deviceName: device.deviceName,
      }).toString(),
    });
  };

  const navigateToDeviceShare = (dids) => {
    if (!dids) return;
    navigate({
      pathname: '/biz/devices/device-share',
      search: createSearchParams({ dids }).toString(),
    });
  };

  const navigateToDeviceSetting = (device) => {
    if (!device) return;
    let path = '';
    if (
      gUtils.isLockModel(device.deviceModel) ||
      isAppLockModel(device.deviceModel) ||
      gUtils.isOPSModel(device.deviceModel)
    ) {
      path = '/device-setting';
    }
    navigate({
      pathname: path,
      search: createSearchParams({
        ...(isAppHome ? { appHome: '1', fromType: 'app' } : {}),
        deviceUUID: device.deviceUUID,
        keyLevel: device.keyLevel,
        deviceModel: device.deviceModel,
        deviceName: device.deviceName,
      }).toString(),
    });
  };

  return {
    navigateToDeviceDetail,
    navigateToDeviceShare,
    navigateToDeviceSetting,
  };
};
