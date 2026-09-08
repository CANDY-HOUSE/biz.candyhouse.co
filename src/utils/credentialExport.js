import { saveAs } from 'file-saver';
import { gUtils } from './gUtils';

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
        return { name: name.trim() ? name : index === 0 ? 'NFC' : `NFCカード${index + 1}`, id };
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
          account: name.trim() ? name : index === 0 ? '暗証番号' : `暗証番号${index + 1}`,
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
    gUtils.csvUtils.downloadLists(list, format === 'csv', fileName);
  }
}
