// Shared English labels for platform-neutral bridge states.
const stateLabels = new Map(
  Object.entries({
    reset: 'Reset',
    receivedBle: 'Received Ble',
    bleConnecting: 'Ble Connecting',
    waitingGatt: 'Waiting gatt',
    waitingForAuth: 'Waiting auth',
    bleLogining: 'Ble Logging in',
    readyToRegister: 'Ready to register',
    registering: 'Registering',
    busy: 'Busy',
    locked: 'Locked',
    unlocked: 'Unlocked',
    noSettings: 'No settings',
    moved: 'Moved',
    waitApConnect: 'waitApConnect',
    dfumode: 'dfumode',
    // The registration list shows the raw state name; other pages use bleStatus.noSignal.
    noBleSignal: 'NoBleSignal',
  })
);

export function bleStateLabel(state) {
  return stateLabels.get(state) || '';
}

export function bleStatusText(device, bluetoothOff, t) {
  if (bluetoothOff) return t('bleStatus.off');
  if (!device || device.bleConnected) return '';
  if (device.bleState === 'noBleSignal') return t('bleStatus.noSignal');
  return bleStateLabel(device.bleState);
}
