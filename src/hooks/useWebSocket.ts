// hooks/useWebSocket.ts
import { useEffect } from 'react';
import WebSocketManager from '../websocket/WebSocketManager.ts';

export const useWebSocket = (key: string, handler: Function) => {
  useEffect(() => {
    WebSocketManager.subscribe(key, handler);
    return () => WebSocketManager.unsubscribe(key);
  }, [key, handler]);
};

// 单独导出 sendMessage 方法
export const sendMessage = (message: any) => WebSocketManager.sendMessage(message);
