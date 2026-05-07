// websocket/WebSocketManager.ts
import { WS_HEARTBEAT_INTERVAL_MS, ACTION_TYPES } from '@constants/messageConstants';
import { envConfig } from '../env_config';
import i18n from '@/i18n';

/* eslint-disable no-unused-vars */
export enum WS_STATUS {
  DISCONNECTED = 0, // 未连接
  CONNECTING = 1, // 连接中
  CONNECTED = 2, // 已连接
}
/* eslint-enable no-unused-vars */

class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private subscribers = new Map<string, Function>();

  // 重连与退避控制
  private reconnectTimer: any = null;
  private connectionTimeoutTimer: any = null;
  private retryCount = 0;
  private readonly minReconnectionDelay = 1000;
  private readonly maxReconnectionDelay = 10000;
  private readonly connectionTimeout = 5000;

  // 心跳与活跃检测
  private heartbeatTimer: any = null;
  private pongTimeoutTimer: any = null;
  private lastActiveTime: number = Date.now();
  private maxIdleTimeInterval: number = 1.5 * WS_HEARTBEAT_INTERVAL_MS;

  private lastTickTime: number = Date.now();
  private sleepDetectorTimer: any = null;
  private readonly SLEEP_CHECK_INTERVAL = 2000;
  private readonly SLEEP_THRESHOLD = 5000;
  private messageQueue: any[] = [];
  private authenticatedToken: string = '';
  private connectionId: string = '';
  private connectionFailureCallback: ((_token: string) => Promise<boolean>) | null = null;
  private readonly MAX_RETRIES_BEFORE_TOKEN_CHECK = 3;
  private currentStatus: WS_STATUS = WS_STATUS.DISCONNECTED;
  private statusListeners: Set<(_status: WS_STATUS) => void> = new Set();
  private connectionIdListeners: Set<(_connectionId: string) => void> = new Set();

  private constructor() {
    window.addEventListener('beforeunload', () => {
      this.closeConnection();
    });

    window.addEventListener('offline', () => {
      console.log('【WS】网络断开');
      this.updateStatus(WS_STATUS.DISCONNECTED);
    });

    window.addEventListener('online', () => {
      console.log('【WS】网络恢复');
      this.wakeUpConnection();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('【WS】页面可见，检查连接状态');
        this.wakeUpConnection();
      } else {
        this.lastActiveTime = Date.now();
      }
    });

    this.startSleepDetector();

    this.subscribe(ACTION_TYPES.BIZ3_KEEP_ALIVE, (response: any) => {
      const newConnectionId = response.connectionId;
      const isRealChange = this.connectionId !== '' && this.connectionId !== newConnectionId;
      if (isRealChange) {
        this.updateConnectionId(newConnectionId);
      } else if (this.connectionId === '') {
        this.connectionId = newConnectionId;
      }
      console.log('【WS】当前连接ID:', this.connectionId);
      this.clearPongTimeout();
      this.updateStatus(WS_STATUS.CONNECTED);
    });
  }

  static getInstance() {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private updateStatus(status: WS_STATUS) {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  public onStatusChange(callback: (_status: WS_STATUS) => void) {
    this.statusListeners.add(callback);
    callback(this.currentStatus);
    return () => this.statusListeners.delete(callback);
  }

  private updateConnectionId(newConnectionId: string) {
    this.connectionId = newConnectionId;
    console.log('【WS】连接ID已更新:', newConnectionId);
    this.connectionIdListeners.forEach((listener) => listener(newConnectionId));
  }

  public onConnectionIdChange(callback: (_connectionId: string) => void) {
    this.connectionIdListeners.add(callback);
    return () => this.connectionIdListeners.delete(callback);
  }

  public getStatus() {
    return this.currentStatus;
  }

  private wakeUpConnection() {
    this.updateStatus(WS_STATUS.CONNECTING);
    const idleTime = Date.now() - this.lastActiveTime;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || idleTime > this.maxIdleTimeInterval) {
      console.log(`【WS】检测到长时间不活跃(${Math.floor(idleTime / 1000)}秒)或连接断开，尝试重连`);
      this.reconnect();
    } else {
      console.log('【WS】唤醒检查：状态为OPEN，发送主动探测包验证链路有效性');
      this.triggerHeartbeatCheck();
    }
  }

  private startSleepDetector() {
    if (this.sleepDetectorTimer) clearInterval(this.sleepDetectorTimer);
    this.lastTickTime = Date.now();
    this.sleepDetectorTimer = setInterval(() => {
      const now = Date.now();
      if (now - this.lastTickTime > this.SLEEP_THRESHOLD) {
        console.log(`【WS】检测到系统从休眠中唤醒 (停顿了 ${now - this.lastTickTime}ms)`);
        this.wakeUpConnection();
      }
      this.lastTickTime = now;
    }, this.SLEEP_CHECK_INTERVAL);
  }

  public connect(token: string) {
    if (!token) {
      console.error('【WS】无效的 token');
      return;
    }
    if (this.ws) {
      this.closeConnection();
    }
    this.authenticatedToken = token;
    this.retryCount = 0;
    this.initWebSocket(token);
  }

  public closeConnection() {
    this.clearAllTimers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
    }
    this.ws = null;
    this.authenticatedToken = '';
    this.updateStatus(WS_STATUS.DISCONNECTED);
  }

  public getConnectionId() {
    return this.connectionId;
  }

  public setConnectionFailureCallback(callback: (_token: string) => Promise<boolean>) {
    this.connectionFailureCallback = callback;
  }

  private reconnect() {
    if (!this.authenticatedToken) return;
    if (!this.checkNetworkStatus()) {
      console.log('【WS】当前无网络，取消主动重连，等待网络恢复');
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      console.log('【WS】正在连接中，忽略重复的重连请求');
      return;
    }
    console.log('【WS】主动执行重连...');
    this.clearAllTimers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    this.retryCount = 0;
    this.initWebSocket(this.authenticatedToken);
  }

  // 被动退避重连 (用于异常断开)
  private async handleReconnect() {
    if (!this.authenticatedToken) {
      console.log('【WS】无 token，不进行重连');
      return;
    }
    if (!this.checkNetworkStatus()) {
      console.log('【WS】当前无网络，暂停退避重连机制，等待网络恢复');
      return;
    }
    if (this.reconnectTimer) {
      console.log('【WS】已有重连任务在等待，忽略重复退避');
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return;
    }
    let delay = this.minReconnectionDelay * Math.pow(1.5, this.retryCount);
    delay = Math.min(delay, this.maxReconnectionDelay);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      console.log(`【WS】尝试重连... (次数:${this.retryCount + 1}) 延迟:${Math.floor(delay)}ms`);
      this.retryCount++;
      if (this.retryCount === this.MAX_RETRIES_BEFORE_TOKEN_CHECK && this.connectionFailureCallback) {
        console.log('【WS】重试多次失败，检查 token');
        const tokenRefreshed = await this.connectionFailureCallback(this.authenticatedToken);
        if (tokenRefreshed) {
          console.log('【WS】Token 已刷新，重置计数器');
          this.retryCount = 0;
          return;
        }
      }
      this.initWebSocket(this.authenticatedToken);
    }, delay);
  }

  private checkNetworkStatus(): boolean {
    return navigator.onLine;
  }

  private initWebSocket(token: string) {
    try {
      this.updateStatus(WS_STATUS.CONNECTING);
      const wsUrl = `${envConfig.getConfigAwsUrl()}?token=${encodeURIComponent(token)}&lang=${i18n.language}`;
      if (!wsUrl) throw new Error('WebSocket URL未配置');
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.close();
      }
      this.ws = new WebSocket(wsUrl);
      console.log('【WS】WebSocket实例已创建: ', this.ws);
      if (this.connectionTimeoutTimer) clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.log('【WS】连接超时未就绪，主动关闭并重连');
          this.ws.close();
        }
      }, this.connectionTimeout);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('【WS】WebSocket初始化失败:', error);
      this.handleReconnect();
    }
  }

  private setupWebSocketHandlers() {
    if (!this.ws) return;
    this.ws.onopen = (_event) => {
      this.updateStatus(WS_STATUS.CONNECTED);
      console.log('【WS】WebSocket连接成功', new Date().toLocaleString());
      if (this.connectionTimeoutTimer) {
        clearTimeout(this.connectionTimeoutTimer);
        this.connectionTimeoutTimer = null;
      }
      this.retryCount = 0;
      this.lastActiveTime = Date.now();
      this.startHeartbeat();
      this.processMessageQueue();
    };
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`【WS 收到消息⬇${new Date().toLocaleString()}】`, message.action, message);
        this.lastActiveTime = Date.now();
        this.notifySubscribers(message);
      } catch (e) {
        console.error('【WS】消息解析失败:', e);
      }
    };
    this.ws.onclose = (event) => {
      this.updateStatus(WS_STATUS.DISCONNECTED);
      console.log('【WS】WebSocket连接关闭', event, new Date().toLocaleString());
      this.clearAllTimers();
      this.handleReconnect();
    };
    this.ws.onerror = (event) => {
      console.error('【WS】WebSocket错误:', event);
    };
  }

  // ---- 心跳防假死机制 ----
  private triggerHeartbeatCheck() {
    this.clearPongTimeout();
    this.sendMessage({ action: ACTION_TYPES.BIZ3_KEEP_ALIVE });
    this.pongTimeoutTimer = setTimeout(() => {
      console.log('【WS】心跳超时未响应，判定假死，尝试重连');
      this.reconnect();
    }, 3000);
  }

  private clearPongTimeout() {
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.triggerHeartbeatCheck();
      }
    }, WS_HEARTBEAT_INTERVAL_MS);
    this.triggerHeartbeatCheck();
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearPongTimeout();
  }

  private clearAllTimers() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
  }

  // ---- 消息分发与队列系统 ----
  subscribe(key: string, callback: Function) {
    this.subscribers.set(key, callback);
  }

  unsubscribe(key: string) {
    this.subscribers.delete(key);
  }

  private notifySubscribers(message: any) {
    const action = message.action;
    if (this.subscribers.has(action)) {
      this.subscribers.get(action)!(message);
    } else {
      console.log(`【WS】 No subscriber for action: ${action}`);
    }
  }

  async sendMessage(message: any) {
    console.log(`【WS 发送消息⬆${new Date().toLocaleString()}】`, message.action, message);
    if (!this.checkNetworkStatus()) {
      console.error('【WS】当前无网络连接，消息发送失败');
      return;
    }
    if (this.ws?.readyState !== WebSocket.OPEN) {
      const existingIndex = this.messageQueue.findIndex((msg) => msg.action === message.action);
      if (existingIndex !== -1) {
        this.messageQueue[existingIndex] = message;
      } else {
        this.messageQueue.push(message);
      }
      console.log('【WS】WebSocket未连接，消息已加入队列');
      return;
    }
    this.ws.send(JSON.stringify(message));
  }

  private async processMessageQueue() {
    if (this.messageQueue.length > 0) {
      console.log({ '【WS】检查队列消息': JSON.stringify(this.messageQueue) });
    }
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue[0];
      try {
        await this.sendMessage(msg);
        this.messageQueue.shift();
      } catch (error) {
        console.error(`【WS】队列消息发送失败:`, error);
        break;
      }
    }
  }
}

export default WebSocketManager.getInstance();
