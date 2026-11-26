import { isAppLockModel } from '@/services/appLockSettings';
import { isAppHome } from '@/services/deviceService';
import { gUtils } from '@/utils/gUtils';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/manifest';

export const deviceDetailPath = (device) => {
  const isAppGuest = isAppHome && Number(device.keyLevel) === 2;
  // Bot 1 keeps no device history; open its settings directly.
  if (isAppHome && device.deviceModel === 'ssmbot_1') return PATHS.deviceSetting.index;
  if (gUtils.isLockModel(device.deviceModel) || isAppLockModel(device.deviceModel)) {
    return isAppGuest ? PATHS.deviceSetting.index : PATHS.doors.item;
  }
  if (isAppGuest && gUtils.isOPSModel(device.deviceModel)) return PATHS.deviceSetting.index;
  if (gUtils.isWifiModel(device.deviceModel)) return PATHS.hub.index;
  return PATHS.accessControl.region;
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
      pathname: PATHS.doors.share,
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
      path = PATHS.deviceSetting.index;
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
