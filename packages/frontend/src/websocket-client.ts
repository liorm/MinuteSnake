export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export interface PlayerInfo {
  id: string;
  name: string;
  isConnected: boolean;
}

export interface RoomInfo {
  roomId: string;
  createdAt: number;
  playerCount: number;
  maxPlayers: number;
  isActive: boolean;
  players: PlayerInfo[];
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface ChatMessage extends WebSocketMessage {
  type: 'chat';
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface PlayerJoinedMessage extends WebSocketMessage {
  type: 'player_joined';
  playerId: string;
  playerName: string;
  playerCount: number;
}

export interface PlayerLeftMessage extends WebSocketMessage {
  type: 'player_left';
  playerId: string;
  playerName: string;
  playerCount: number;
}

export interface PongMessage extends WebSocketMessage {
  type: 'pong';
  timestamp: number;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  message: string;
}

export type IncomingMessage =
  | ChatMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PongMessage
  | ErrorMessage;

export interface WebSocketClientConfig {
  baseUrl: string;
  roomId: string;
  playerId: string;
  playerName: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
}

export interface WebSocketClientCallbacks {
  onStateChange?: (state: ConnectionState) => void;
  onMessage?: (message: IncomingMessage) => void;
  onError?: (error: Error) => void;
  onRoomInfo?: (info: RoomInfo) => void;
}

/**
 * WebSocket client for MinuteSnake multiplayer communication.
 * Handles connection management, reconnection logic, and message routing.
 *
 * Example:
 * ```
 * const client = new WebSocketClient({
 *   baseUrl: 'ws://localhost:8787',
 *   roomId: 'my-room',
 *   playerId: 'player-123',
 *   playerName: 'Alice'
 * });
 *
 * client.connect();
 * client.sendChat('Hello world!');
 * ```
 */
export class WebSocketClient {
  private config: Required<WebSocketClientConfig>;
  private callbacks: WebSocketClientCallbacks;
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private lastPongTime = 0;

  constructor(config: WebSocketClientConfig, callbacks: WebSocketClientCallbacks = {}) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      pingInterval: 30000,
      ...config,
    };
    this.callbacks = callbacks;
  }

  /**
   * Initiate connection to the WebSocket server
   */
  async connect(): Promise<void> {
    if (
      this.connectionState === ConnectionState.CONNECTING ||
      this.connectionState === ConnectionState.CONNECTED
    ) {
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      // First create the room if it doesn't exist
      await this.createRoom();

      // Then connect to WebSocket
      await this.connectWebSocket();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Connection failed'));
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.clearPingTimer();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Send a chat message to all players in the room
   */
  sendChat(message: string): void {
    this.sendMessage({
      type: 'chat',
      message,
    });
  }

  /**
   * Send a ping to test connection
   */
  ping(): void {
    this.sendMessage({
      type: 'ping',
      timestamp: Date.now(),
    });
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get current room information
   */
  async getRoomInfo(): Promise<RoomInfo | null> {
    try {
      const response = await fetch(`${this.getHttpUrl()}/room/${this.config.roomId}/info`);

      if (!response.ok) {
        return null;
      }

      const info = (await response.json()) as RoomInfo;
      this.callbacks.onRoomInfo?.(info);
      return info;
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to get room info'));
      return null;
    }
  }

  private async createRoom(): Promise<void> {
    const response = await fetch(`${this.getHttpUrl()}/room/${this.config.roomId}/create`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to create room: ${response.status} ${response.statusText}`);
    }
  }

  private async connectWebSocket(): Promise<void> {
    const wsUrl = this.getWebSocketUrl();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = (): void => {
          this.setConnectionState(ConnectionState.CONNECTED);
          this.reconnectAttempt = 0;
          this.startPing();
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent): void => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event: CloseEvent): void => {
          this.handleClose(event);
        };

        this.ws.onerror = (): void => {
          reject(new Error('WebSocket connection failed'));
        };

        // Set timeout for connection
        setTimeout(() => {
          if (this.connectionState === ConnectionState.CONNECTING) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Unknown error'));
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as IncomingMessage;

      if (message.type === 'pong') {
        this.lastPongTime = Date.now();
      }

      this.callbacks.onMessage?.(message);
    } catch {
      this.handleError(new Error('Failed to parse message'));
    }
  }

  private handleClose(event: CloseEvent): void {
    this.ws = null;
    this.clearPingTimer();

    if (event.code === 1000) {
      // Normal closure
      this.setConnectionState(ConnectionState.DISCONNECTED);
    } else if (this.reconnectAttempt < this.config.reconnectAttempts) {
      // Attempt reconnection
      this.setConnectionState(ConnectionState.RECONNECTING);
      this.scheduleReconnect();
    } else {
      // Max reconnect attempts reached
      this.setConnectionState(ConnectionState.ERROR);
      this.handleError(new Error('Max reconnection attempts reached'));
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempt);
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket().catch(error => {
        this.handleError(error);
      });
    }, delay);
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.connectionState !== ConnectionState.CONNECTED || !this.ws) {
      this.handleError(new Error('Cannot send message: not connected'));
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to send message'));
    }
  }

  private startPing(): void {
    this.clearPingTimer();

    this.pingTimer = setInterval(() => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        const now = Date.now();

        // Check if we haven't received a pong recently
        if (this.lastPongTime > 0 && now - this.lastPongTime > this.config.pingInterval * 2) {
          this.handleError(new Error('Connection appears to be dead'));
          return;
        }

        this.ping();
      }
    }, this.config.pingInterval);
  }

  private clearPingTimer(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.callbacks.onStateChange?.(state);
    }
  }

  private handleError(error: Error): void {
    this.callbacks.onError?.(error);
  }

  private getHttpUrl(): string {
    return this.config.baseUrl.replace(/^ws/, 'http');
  }

  private getWebSocketUrl(): string {
    const wsBase = this.config.baseUrl.replace(/^http/, 'ws');
    const params = new URLSearchParams({
      playerId: this.config.playerId,
      playerName: this.config.playerName,
    });

    return `${wsBase}/room/${this.config.roomId}?${params.toString()}`;
  }
}
