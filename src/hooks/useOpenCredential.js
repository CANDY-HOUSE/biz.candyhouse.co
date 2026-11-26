import { useLocation } from 'react-router-dom';
import { isAppHome } from '@/services/deviceService';
import { PATHS } from '@/routes/manifest';
import { useSettingsNavigate } from '@/components/settingsSubPage';

// kind: card | passcode | fingerprint | face | palm.
// The APP manages every kind over BLE; the browser writes cards and passcodes through the Hub on their own pages
// and shows the others read-only. Inside the PC detail panel these pages open in the panel's column.
export function useOpenCredential() {
  const navigate = useSettingsNavigate();
  const location = useLocation();
  return ({ kind, deviceUUID, deviceName, deviceModel }) => {
    if (!isAppHome && (kind === 'card' || kind === 'passcode')) {
      navigate(kind === 'card' ? PATHS.accessControl.cards : PATHS.accessControl.passwords, {
        state: { title: deviceName || '', uuid: deviceUUID },
      });
      return;
    }
    const search = new URLSearchParams(location.search);
    search.set('deviceUUID', deviceUUID);
    search.set('kind', kind);
    search.set('deviceModel', deviceModel);
    navigate({ pathname: PATHS.deviceSetting.credentials, search: search.toString() });
  };
}
