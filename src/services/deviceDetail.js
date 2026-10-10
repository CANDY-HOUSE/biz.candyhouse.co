// Detail responses share a slot; never use a response belonging to another device.
export function deviceDetailFor(deviceUUID, detail, devices = []) {
  const matches = (device) => device?.deviceUUID?.toUpperCase() === deviceUUID.toUpperCase();
  const listed = devices.find(matches) || {};
  if (!matches(detail)) return listed;
  const stateInfo = { ...listed.stateInfo, ...detail.stateInfo };
  // A partial/cloud read must not erase a version or battery already read over BLE.
  for (const key of ['currentFwVer', 'batteryPercentage']) {
    if (stateInfo[key] == null || stateInfo[key] === '') stateInfo[key] = listed.stateInfo?.[key];
  }
  return { ...listed, ...detail, stateInfo };
}
