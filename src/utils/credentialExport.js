import { saveAs } from 'file-saver';
import { gUtils } from './gUtils';
import i18n from '@/i18n';
import { PATHS } from '@/routes/manifest';

// Use the raw cardID, not the UUID padded for display by formatCardID.
export function buildCredentialJson(list, type) {
  if (type === 'cards') {
    return {
      nfc_cards: list.map((item, index) => {
        const id = String(item.cardID ?? '').toLowerCase();
        if (!/^(?:[0-9a-f]{2})+$/.test(id)) {
          throw new Error('Invalid card ID');
        }
        const name = String(item.name ?? '');
        return {
          name: name.trim() ? name : index === 0 ? 'NFC' : i18n.t('csv.defaultName.nfcCard', { index: index + 1 }),
          id,
        };
      }),
    };
  }
  if (type === 'passcodes') {
    return {
      passcodes: list.map((item, index) => {
        const encoded = String(item.passwordID ?? '');
        if (!/^(?:0[0-9])+$/.test(encoded)) {
          throw new Error('Invalid passcode');
        }
        const name = String(item.name ?? '');
        return {
          account: name.trim()
            ? name
            : index === 0
              ? i18n.t('csv.defaultName.passcode')
              : i18n.t('csv.defaultName.passcodeIndexed', { index: index + 1 }),
          password: gUtils.binaryToDecimal(encoded),
        };
      }),
    };
  }
  throw new Error('Unsupported credential type');
}

export function downloadCredentials(list, type, format, fileName = 'sesamebiz') {
  if (format === 'json') {
    const json = JSON.stringify(buildCredentialJson(list, type), null, 2);
    saveAs(new Blob([json], { type: 'application/json;charset=utf-8' }), `${fileName}.json`);
  } else {
    const tablePath = type === 'cards' ? PATHS.accessControl.cards : PATHS.accessControl.passwords;
    gUtils.csvUtils.downloadLists(list, format === 'csv', fileName, tablePath);
  }
}
