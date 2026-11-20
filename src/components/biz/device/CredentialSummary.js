import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { gConfig } from '@constants/gConfig';
import { gUtils } from '@/utils/gUtils';
import { isAppHome } from '@/services/deviceService';
import { useCredentialCounts } from '@/hooks/useBleSnapshot';
import CfpContent from './CfpContent';

const credentialKinds = {
  [gConfig.sesameTouchProAuthType.finger]: 'fingerprint',
  [gConfig.sesameTouchProAuthType.face]: 'face',
  [gConfig.sesameTouchProAuthType.palm]: 'palm',
};

// Registered cards, passcodes and biometrics of an access control device; biometrics open through onCredential.
export default function CredentialSummary({ device, did, onCredential }) {
  const navigate = useNavigate();
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
        if (credentialKinds[type]) {
          if (!webCounts) return;
          onCredential(credentialKinds[type]);
          return;
        }
        let mstate = {
          title: device.deviceName,
          uuid: device.deviceUUID,
        };
        let path = '';
        if (type === gConfig.sesameTouchProAuthType.card) {
          path = '/biz/access-control/cards';
        } else if (type === gConfig.sesameTouchProAuthType.password) {
          path = '/biz/access-control/passwords';
        }
        navigate(path, { state: mstate });
      }}
    />
  );
}
