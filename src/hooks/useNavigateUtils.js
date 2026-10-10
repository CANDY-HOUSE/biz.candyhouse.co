import { isAppLockModel } from '@/services/appLockSettings';
import { isAppHome } from '@/services/deviceService';
import { gUtils } from '@/utils/gUtils';
import { createSearchParams, useNavigate } from 'react-router-dom';

export const useNavigateUtils = () => {
  const navigate = useNavigate();

  const navigateToDeviceDetail = (device) => {
    if (!device) return;
    let path = '';
    if (gUtils.isLockModel(device.deviceModel) || isAppLockModel(device.deviceModel)) {
      path =
        isAppHome && isAppLockModel(device.deviceModel) && Number(device.keyLevel) === 2
          ? '/device-setting'
          : '/biz/devices/list-item';
    } else if (gUtils.isWifiModel(device.deviceModel)) {
      path = '/biz/wifi-module/index';
    } else {
      path = '/biz/access-control/region';
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
