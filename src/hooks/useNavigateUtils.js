import { gUtils } from '@/utils/gUtils';
import { createSearchParams, useNavigate } from 'react-router-dom';

export const useNavigateUtils = () => {
  const navigate = useNavigate();

  const navigateToDeviceDetail = (device) => {
    if (!device) return;
    let path = '';
    if (gUtils.isLockModel(device.deviceModel)) {
      path = '/biz/devices/list-item';
    } else if (gUtils.isWifiModel(device.deviceModel)) {
      path = '/biz/wifi-module/index';
    } else {
      path = '/biz/access-control/region';
    }
    navigate({
      pathname: path,
      search: createSearchParams({
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
    if (gUtils.isLockModel(device.deviceModel)) {
      path = '/device-setting';
    }
    navigate({
      pathname: path,
      search: createSearchParams({
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
