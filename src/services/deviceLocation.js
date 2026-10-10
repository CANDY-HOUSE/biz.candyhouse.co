import { deviceService, isAppHome } from './deviceService';
import { appOperation } from './appOperations';
import { isAppLockModel } from './appLockSettings';
import { isBotModel } from './botScripts';
import { isBike } from './peripheralSettings';
import { modelNameByProductType } from '@/constants/sesameDeviceModel';

// Legacy list icon taps upload location independently of command success. No permission prompts or retries.
export async function reportDeviceLocation(device, account) {
  if (
    !isAppHome ||
    !(isAppLockModel(device.deviceModel) || isBotModel(device.deviceModel) || isBike(device.deviceModel))
  )
    return;
  try {
    const { data } = await deviceService.request('currentLocation');
    if (!data || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return;
    const productType = Object.keys(modelNameByProductType).find(
      (type) => modelNameByProductType[type] === device.deviceModel
    );
    if (productType === undefined) return;
    await appOperation(
      'deviceInfo',
      { deviceModel: productType, longitude: String(data.longitude), latitude: String(data.latitude) },
      { deviceUUID: device.deviceUUID, account }
    );
  } catch (_) {
    // This optional telemetry must not affect the lock operation or disclose coordinates in logs.
  }
}
