import { ACTION_TYPES } from '@/constants/messageConstants';
import WebSocketManager from '@/websocket/WebSocketManager.ts';
import { createDevicePageCollector } from './devicePages';

// Existing useManageDevice subscribers apply the snapshot; keep the visible
// list and native BLE session alive while waiting for all device pages.
export function refreshAppDevices(companyID, signal) {
  return new Promise((resolve, reject) => {
    if (!companyID || signal.aborted) {
      reject(new Error('Device refresh unavailable'));
      return;
    }
    const action = ACTION_TYPES.BIZ3_MANAGE_DEVICE;
    const collect = createDevicePageCollector();
    let timer;
    const finish = (error) => {
      clearTimeout(timer);
      WebSocketManager.unsubscribe(action, receive);
      signal.removeEventListener('abort', abort);
      error ? reject(error) : resolve();
    };
    const abort = () => finish(new Error('Device refresh cancelled'));
    const receive = (message) => {
      if (!['getCompanyDevice', 'PubedCompanyDevice'].includes(message.op)) return;
      if (!message.success) return finish(new Error('Device refresh failed'));
      if (message.op !== 'PubedCompanyDevice') return;
      const data = message.data;
      if (collect({ list: data?.data?.list, page: data?.data?.page, totalPage: data?.totalPage }) !== null) finish();
    };
    WebSocketManager.subscribe(action, receive);
    signal.addEventListener('abort', abort);
    timer = setTimeout(() => finish(new Error('Device refresh timed out')), 30000);
    // Do not queue a manual refresh for replay after reconnection.
    WebSocketManager.sendMessage({ action, op: 'getCompanyDevice', companyID }, false).catch(finish);
  });
}
