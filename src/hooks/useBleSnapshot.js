import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { credentialTotal, loadBleSnapshot } from '@/services/bleSnapshot';
import { peripheralCapabilities } from '@/services/peripheralSettings';

// Pass null to skip loading (the APP reads the device directly).
export function useBleSnapshot(deviceUUID) {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    setSnapshot(null);
    if (!deviceUUID) return;
    let active = true;
    loadBleSnapshot(deviceUUID)
      .then((data) => {
        if (active) setSnapshot(data || {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [deviceUUID]);
  return snapshot;
}

// Each kind is a number once loaded, null if the request failed.
export function useCredentialCounts(deviceUUID, model) {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    setCounts({});
    if (!deviceUUID) return;
    let active = true;
    peripheralCapabilities(model).forEach((kind) =>
      credentialTotal(deviceUUID, kind)
        .then((total) => active && setCounts((previous) => ({ ...previous, [kind]: total })))
        .catch(() => active && setCounts((previous) => ({ ...previous, [kind]: null })))
    );
    return () => {
      active = false;
    };
  }, [deviceUUID, model]);
  return counts;
}

export function useAppOnlyNotice() {
  const { t } = useTranslation();
  const { setSnackbarValue } = useContext(GlobalStateContext);
  return () => setSnackbarValue({ open: true, msg: t('lockSettings.useApp'), severity: 'info' });
}
