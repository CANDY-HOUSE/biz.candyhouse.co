import WebSocketManager, { WS_STATUS } from '@/websocket/WebSocketManager.ts';
import { appRequestContext } from './appSession';

const action = 'biz3AppOperations';
let sequence = 0;

function send(message, isCurrent, queue = false) {
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
      if (!isCurrent() || !message.success) finish(new Error('App operation failed'));
      else finish(null, message.data);
    };
    WebSocketManager.subscribe(action, receive);
    if (!queue)
      offStatus = WebSocketManager.onStatusChange((status) => {
        if (status !== WS_STATUS.CONNECTED) finish(new Error('Connection changed'));
      });
    timer = setTimeout(() => finish(new Error('App operation timed out')), 28000);
    WebSocketManager.sendMessage({ action, requestId, ...message }, queue).catch((error) => finish(error));
  });
}

// Use the existing socket; never queue a BLE handshake or replay it under another account.
export async function appOperation(op, body, { account, guestIdentityId, language, deviceUUID } = {}) {
  // The legacy backend accepts language-region, without the Android script subtag.
  const locale = language ? new Intl.Locale(language.replace(/_/g, '-')) : null;
  const region = locale?.region || (locale?.script === 'Hant' ? 'TW' : locale?.script === 'Hans' ? 'CN' : '');
  const requestLanguage = locale ? `${locale.language}${region ? `-${region}` : ''}` : undefined;
  const session = await appRequestContext(account);
  if (WebSocketManager.getStatus() !== WS_STATUS.CONNECTED) throw new Error('Connection unavailable');
  return send(
    {
      op,
      body,
      account: session.subject,
      installationId: session.identityId,
      guestIdentityId,
      language: requestLanguage,
      deviceUUID,
    },
    session.isCurrent
  );
}

// Read-only requests from the signed-in web page run under the socket's own user and may wait for it to connect.
export function webOperation(op, body, deviceUUID) {
  return send({ op, body, deviceUUID }, () => true, true);
}
