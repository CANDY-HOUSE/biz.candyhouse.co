import { useContext } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { gConfig } from '@constants/gConfig';
import { gUtils } from '@/utils/gUtils';
import { isAppHome } from '@/services/deviceService';
import { useCredentialCounts } from '@/hooks/useBleSnapshot';
import CfpContent from './CfpContent';
import { useOpenCredential } from '@/hooks/useOpenCredential';

const credentialKinds = {
  [gConfig.sesameTouchProAuthType.finger]: 'fingerprint',
  [gConfig.sesameTouchProAuthType.face]: 'face',
  [gConfig.sesameTouchProAuthType.palm]: 'palm',
};

// Registered cards, passcodes and biometrics of an access control device.
export default function CredentialSummary({ device, did }) {
  const openCredential = useOpenCredential();
  const { gMediaType } = useContext(GlobalStateContext);
  const webCounts = !isAppHome && gUtils.isSesameAccessControlDevice(device.deviceModel);
  const counts = useCredentialCounts(webCounts ? did : null, device.deviceModel);
  const count = (kind, fallback) =>
    !webCounts
      ? fallback
      : counts[kind] === undefined
        ? '—'
        : (counts[kind] ?? (kind === 'card' || kind === 'passcode' ? fallback : '—'));

  return (
    <CfpContent
      isMobile={gMediaType.isMobile}
      model={device.deviceModel}
      cc={count('card', device.stateInfo?.cards_num || 0)}
      pc={count('passcode', device.stateInfo?.keyboards_num || 0)}
      {...(webCounts && {
        fc: count('fingerprint'),
        faceCount: count('face'),
        palmCount: count('palm'),
      })}
      call={(type) => {
        if (credentialKinds[type] && !webCounts) return;
        openCredential({
          kind: credentialKinds[type] || (type === gConfig.sesameTouchProAuthType.card ? 'card' : 'passcode'),
          deviceUUID: device.deviceUUID,
          deviceName: device.deviceName,
          deviceModel: device.deviceModel,
        });
      }}
    />
  );
}
