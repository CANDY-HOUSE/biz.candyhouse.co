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
  })
);

export function bleStateLabel(state, t) {
  if (state === 'noBleSignal') return t('bleStatus.noSignal');
  return stateLabels.get(state) || '';
}

export function bleStatusText(device, bluetoothOff, t) {
  if (bluetoothOff) return t('bleStatus.off');
  if (!device || device.bleConnected) return '';
  return bleStateLabel(device.bleState, t);
}
