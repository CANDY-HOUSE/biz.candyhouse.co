import { ACTION_TYPES } from '@/constants/messageConstants';
import WebSocketManager from '@/websocket/WebSocketManager.ts';

export const appPageRefreshEvent = 'sesame:refresh-page';

// The existing page/provider subscribers apply the response without remounting.
export function requestAppRefreshData(request, complete, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('Refresh cancelled'));
    let timer;
    const finish = (error, data) => {
      clearTimeout(timer);
      WebSocketManager.unsubscribe(request.action, receive);
      signal.removeEventListener('abort', abort);
      error ? reject(error) : resolve(data);
    };
    const abort = () => finish(new Error('Refresh cancelled'));
    const receive = (message) => {
      const result = complete(message);
      if (result === null) return;
      finish(message.success ? null : new Error('Refresh failed'), message.data);
    };
    WebSocketManager.subscribe(request.action, receive);
    signal.addEventListener('abort', abort);
    timer = setTimeout(() => finish(new Error('Refresh timed out')), 30000);
    WebSocketManager.sendMessage(request, false).catch(finish);
  });
}

export function refreshOtherAppTab(pathname, { companyID, isAnonymous }, signal) {
  if (pathname === '/vision') {
    return requestAppRefreshData(
      { action: ACTION_TYPES.BIZ3_FACE3_QR, op: 'list' },
      (message) => (message.op === 'list' ? true : null),
      signal
    );
  }
  if (pathname === '/contacts') {
    if (isAnonymous) return Promise.resolve();
    if (!companyID) return Promise.reject(new Error('Account unavailable'));
    let nextPage = 1;
    let count = 0;
    return requestAppRefreshData(
      { action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE, op: 'get', companyID },
      (message) => {
        if (!['get', 'pubEmployees'].includes(message.op)) return null;
        if (!message.success) return true;
        if (message.op !== 'pubEmployees') return null;
        const { totalCount, data } = message.data || {};
        if (!Array.isArray(data?.list) || !Number.isInteger(totalCount) || totalCount < 0) return null;
        if (data.page === 1) {
          nextPage = 1;
          count = 0;
        }
        if (data.page !== nextPage) return null;
        nextPage++;
        count += data.list.length;
        return count >= totalCount ? true : null;
      },
      signal
    );
  }
  const tasks = [];
  window.dispatchEvent(new CustomEvent(appPageRefreshEvent, { detail: { tasks, signal } }));
  if (!tasks.length) return Promise.reject(new Error('Refresh unavailable'));
  return Promise.allSettled(tasks).then((results) => {
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) throw failure.reason;
  });
}
