import WebSocketManager, { WS_STATUS } from '@/websocket/WebSocketManager.ts';
import { appRequestContext } from './appSession';

const action = 'biz3AppOperations';
let sequence = 0;

// Use the existing socket; never queue a BLE handshake or replay it under another account.
export async function appOperation(op, body, { account, guestIdentityId, language, deviceUUID } = {}) {
  // The legacy backend accepts language-region, without the Android script subtag.
  const locale = language ? new Intl.Locale(language.replace(/_/g, '-')) : null;
  const region = locale?.region || (locale?.script === 'Hant' ? 'TW' : locale?.script === 'Hans' ? 'CN' : '');
  const requestLanguage = locale ? `${locale.language}${region ? `-${region}` : ''}` : undefined;
  const session = await appRequestContext(account);
  if (WebSocketManager.getStatus() !== WS_STATUS.CONNECTED) throw new Error('Connection unavailable');
  const requestId = `app_${Date.now()}_${++sequence}`;
  return new Promise((resolve, reject) => {
    let offStatus;
    let timer;
    const finish = (error, data) => {
      clearTimeout(timer);
      WebSocketManager.unsubscribe(action, receive);
      offStatus?.();
      error ? reject(error) : resolve(data);
    };
    const receive = (message) => {
      if (message.requestId !== requestId) return;
      if (!session.isCurrent() || !message.success) finish(new Error('App operation failed'));
      else finish(null, message.data);
    };
    WebSocketManager.subscribe(action, receive);
    offStatus = WebSocketManager.onStatusChange((status) => {
      if (status !== WS_STATUS.CONNECTED) finish(new Error('Connection changed'));
    });
    timer = setTimeout(() => finish(new Error('App operation timed out')), 28000);
    WebSocketManager.sendMessage(
      {
        action,
        requestId,
        op,
        body,
        account: session.subject,
        installationId: session.identityId,
        guestIdentityId,
        language: requestLanguage,
        deviceUUID,
      },
      false
    ).catch((error) => finish(error));
  });
}
