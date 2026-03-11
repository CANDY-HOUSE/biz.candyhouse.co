// websocket/WebSocketManager.ts
import { WS_HEARTBEAT_INTERVAL_MS, ACTION_TYPES } from '@constants/messageConstants';
import { envConfig } from '../env_config';
import i18n from '@/i18n';

class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private subscribers = new Map();
  private reconnectTimer: any = null;
  private readonly MAX_RETRIES = 3;
  private retryCount = 0;
  private heartbeatTimer: any = null; // 心跳定时器
  private messageQueue: any[] = [];
  private authenticatedToken: string = ''; // 添加登录状态标志
  private connectionId: string = ''; // 连接ID

  private constructor() {
    window.addEventListener('beforeunload', () => {
      this.closeConnection();
    });
  }

  static getInstance() {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
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
    this.initWebSocket(token);
  }

  public closeConnection() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
    this.authenticatedToken = '';
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public getConnectionId() {
    return this.connectionId;
  }

  private checkNetworkStatus(): boolean {
    return navigator.onLine;
  }

  private initWebSocket(token: string) {
    try {
      // 确保配置URL存在
      const wsUrl = `${envConfig.getConfigAwsUrl()}?token=${encodeURIComponent(token)}&lang=${i18n.language}`;
      if (!wsUrl) {
        throw new Error('WebSocket URL未配置');
      }
      this.ws = new WebSocket(wsUrl);
      console.log('【WS】WebSocket实例已创建: ', this.ws);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('【WS】WebSocket初始化失败:', error);
      this.handleReconnect();
    }
  }
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.onopen = (_event) => {
      console.log('【WS】WebSocket连接成功', new Date().toLocaleString());
      const heartbeatMessage = { action: ACTION_TYPES.BIZ3_KEEP_ALIVE };
      this.sendMessage(heartbeatMessage);
      this.subscribe(ACTION_TYPES.BIZ3_KEEP_ALIVE, (response: any) => {
        console.log('【WS】收到心跳响应:', response);
        this.connectionId = response.connectionId || this.connectionId; // 更新连接ID
        console.log('【WS】当前连接ID:', this.connectionId);
      });
      this.retryCount = 0;
      this.processMessageQueue();
      this.startHeartbeat(); // 启动心跳定时器;
    };

    this.ws.onmessage = (event) => {
      console.log('【WS】onmessage', new Date().toLocaleString());
      const message = JSON.parse(event.data);
      console.log('【WS】收到消息⬇:', message.action, message);
      this.notifySubscribers(message);
      this.startHeartbeat(); // 重启定时器
    };

    this.ws.onclose = (event) => {
      console.log('【WS】WebSocket连接关闭', event, new Date().toLocaleString());
      this.handleReconnect();
    };

    this.ws.onerror = (event) => {
      console.error('【WS】WebSocket错误:', event);
    };
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // 清除之前的定时器
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const heartbeatMessage = { action: ACTION_TYPES.BIZ3_KEEP_ALIVE };
        this.sendMessage(heartbeatMessage);
        this.subscribe(ACTION_TYPES.BIZ3_KEEP_ALIVE, (response: any) => {
          console.log('【WS】收到心跳响应:', response);
          this.connectionId = response.connectionId || this.connectionId; // 更新连接ID
          console.log('【WS】当前连接ID:', this.connectionId);
        });
      } else {
        console.error('【WS】WebSocket未连接，无法发送心跳包');
      }
    }, WS_HEARTBEAT_INTERVAL_MS);
  }

  private handleReconnect() {
    if (!this.authenticatedToken) {
      console.log('【WS】无 token，不进行重连');
      return;
    }
    if (this.retryCount < this.MAX_RETRIES) {
      this.reconnectTimer = setTimeout(() => {
        console.log(`【WS】尝试重连... (${this.retryCount + 1}/${this.MAX_RETRIES})`);
        this.retryCount++;
        this.initWebSocket(this.authenticatedToken);
      }, 3000);
    } else {
      console.log('【WS】重连次数已达上限，停止重连');
    }
  }

  subscribe(key: string, callback: Function) {
    this.subscribers.set(key, callback);
  }

  unsubscribe(key: string) {
    this.subscribers.delete(key);
  }

  private notifySubscribers(message: any) {
    const action = message.action;
    if (this.subscribers.has(action)) {
      this.subscribers.get(action)(message);
    } else {
      console.log(`【WS】 No subscriber for action: ${action} ${this.subscribers}`);
    }
  }

  async sendMessage(message: any) {
    console.log({ '【WS】发送消息⬆': message.action, message });
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
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('【WS】WebSocket未连接');
    }
  }

  private async processMessageQueue() {
    console.log({ '【WS】检查队列消息': JSON.stringify(this.messageQueue) });
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
