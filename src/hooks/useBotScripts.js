import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { deviceService, isAppHome } from '@/services/deviceService';
import { botScriptRows, initializeBotScripts, isScriptBotModel, saveBotScript } from '@/services/botScripts';

export function useBotScripts(deviceUUID, model, localOnly = false) {
  const { t } = useTranslation();
  const { gManageDevice, setSnackbarValue } = useContext(GlobalStateContext);
  const devices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const native = devices[deviceUUID.toUpperCase()];
  const device = gManageDevice?.companyDevices.find(
    (item) => item.deviceUUID.toUpperCase() === deviceUUID.toUpperCase()
  );
  const metadata = device?.stateInfo?.scriptList || [];
  const current = useRef();
  current.current = { metadata, device, gManageDevice };
  const update = (rows) => {
    const value = current.current;
    value.metadata = rows;
    value.gManageDevice.updateDeviceState({
      deviceUUID: value.device?.deviceUUID || deviceUUID,
      stateInfo: { scriptList: rows },
    });
  };
  const enabled = isAppHome && isScriptBotModel(model || device?.deviceModel);
  const connected = enabled && native?.bleConnected;
  const ready = native?.scripts?.length === 10;
  useEffect(() => {
    if (localOnly || !connected || !ready || !gManageDevice?.devicesLoaded) return;
    let active = true;
    initializeBotScripts(deviceUUID, current.current.metadata, native.scriptIndex ?? 0)
      .then((rows) => {
        if (active) update(rows);
      })
      .catch(() => {
        if (active)
          setSnackbarValue({
            logScope: 'hooks/useBotScripts',
            logReason: 'lockSettings.failed',
            open: true,
            msg: t('lockSettings.failed'),
            severity: 'error',
          });
      });
    return () => {
      active = false;
    };
  }, [deviceUUID, connected, ready, gManageDevice?.devicesLoaded, localOnly]);
  const scripts = botScriptRows(metadata, native?.scripts);
  const selected = scripts.find((row) => row.isDefault)?.id ?? native?.scriptIndex ?? 0;
  const save = async (index, patch) => {
    const row = scripts.find((item) => item.id === index);
    await saveBotScript(deviceUUID, { actionIndex: String(index), displayOrder: row.displayOrder, ...patch });
    const rows = botScriptRows(current.current.metadata, native?.scripts).map((item) => ({
      actionIndex: String(item.id),
      alias: item.name,
      displayOrder: item.displayOrder,
      isDefault: patch.isDefault === 1 ? Number(item.id === index) : Number(item.isDefault),
      ...(item.id === index ? patch : {}),
    }));
    update(rows);
  };
  const select = async (index) => {
    await deviceService.request('botSettings', { deviceUUID, operation: 'select', index });
    await save(index, { isDefault: 1 });
  };
  const reorder = async (ids) => {
    await saveBotScript(deviceUUID, {
      batchDisplayOrders: ids.map((id, displayOrder) => ({ actionIndex: String(id), displayOrder })),
    });
    update(
      scripts.map((row) => ({
        actionIndex: String(row.id),
        alias: row.name,
        isDefault: Number(row.isDefault),
        displayOrder: ids.indexOf(row.id),
      }))
    );
  };
  return { scripts, selected, select, save, reorder, connected, enabled, deviceName: device?.deviceName };
}
