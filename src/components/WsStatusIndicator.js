import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import WebSocketManager, { WS_STATUS } from '@/websocket/WebSocketManager.ts';

const WsStatusIndicator = () => {
  const [status, setStatus] = useState(WebSocketManager.getStatus());
  const theme = useTheme();

  useEffect(() => {
    // 订阅状态变化
    const unsubscribe = WebSocketManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    // 组件卸载时取消订阅
    return () => unsubscribe();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case WS_STATUS.CONNECTED:
        return theme.palette.success.main;
      case WS_STATUS.CONNECTING:
        return theme.palette.warning.main;
      case WS_STATUS.DISCONNECTED:
      default:
        return theme.palette.error.main;
    }
  };

  const isConnecting = status === WS_STATUS.CONNECTING;

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}>
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          animation: isConnecting ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.3;
            }
          }
        `}
      </style>
    </div>
  );
};

export default WsStatusIndicator;
