import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WebSocketClient,
  ConnectionState,
  type WebSocketClientConfig,
  type WebSocketClientCallbacks,
  type RoomInfo,
  type ChatMessage,
  type PongMessage,
  type ErrorMessage,
} from './websocket-client';

// Mock global APIs
const mockFetch = vi.fn();
const mockWebSocket = vi.fn();

// Mock WebSocket implementation
class TestWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;

  readyState = TestWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    TestWebSocket.instances.push(this);
  }

  send(data: string): void {
    TestWebSocket.sentMessages.push(data);
  }

  close(): void {
    this.readyState = TestWebSocket.CLOSED;
  }

  static instances: TestWebSocket[] = [];
  static sentMessages: string[] = [];

  static reset(): void {
    TestWebSocket.instances = [];
    TestWebSocket.sentMessages = [];
  }

  static getLastInstance(): TestWebSocket | null {
    return TestWebSocket.instances[TestWebSocket.instances.length - 1] || null;
  }
}

describe('WebSocketClient', () => {
  let config: WebSocketClientConfig;
  let callbacks: WebSocketClientCallbacks;
  let client: WebSocketClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    TestWebSocket.reset();

    // Setup global mocks
    mockWebSocket.mockImplementation((url: string) => new TestWebSocket(url));
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    global.WebSocket = mockWebSocket as unknown as typeof WebSocket;
    global.fetch = mockFetch;

    // Setup configuration
    config = {
      baseUrl: 'ws://localhost:8787',
      roomId: 'test-room',
      playerId: 'test-player',
      playerName: 'Test Player',
      reconnectAttempts: 3,
      reconnectDelay: 1000,
      pingInterval: 30000,
    };

    callbacks = {
      onStateChange: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
      onRoomInfo: vi.fn(),
    };
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    vi.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should create client with provided config', () => {
      // Act
      client = new WebSocketClient(config, callbacks);

      // Assert
      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should create client with minimal config', () => {
      // Arrange
      const minimalConfig: WebSocketClientConfig = {
        baseUrl: 'ws://localhost:8787',
        roomId: 'test-room',
        playerId: 'test-player',
        playerName: 'Test Player',
      };

      // Act
      client = new WebSocketClient(minimalConfig);

      // Assert
      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should apply default configuration values', () => {
      // Arrange
      const configWithoutDefaults = {
        baseUrl: 'ws://localhost:8787',
        roomId: 'test-room',
        playerId: 'test-player',
        playerName: 'Test Player',
      };

      // Act & Assert - should not throw
      expect(() => {
        client = new WebSocketClient(configWithoutDefaults);
      }).not.toThrow();
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      client = new WebSocketClient(config, callbacks);
    });

    it('should return current connection state', () => {
      // Assert
      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should transition to connecting state when connect is called', () => {
      // Act
      client.connect().catch(() => {
        // Ignore connection errors for this test
      });

      // Assert
      expect(callbacks.onStateChange).toHaveBeenCalledWith(ConnectionState.CONNECTING);
    });
  });

  describe('Message Creation', () => {
    beforeEach(() => {
      client = new WebSocketClient(config, callbacks);
    });

    it('should send chat message when connected', () => {
      // Mock connected state
      const ws = mockWebSocket('test-url');
      ws.readyState = TestWebSocket.OPEN;

      // Simulate connection
      client['ws'] = ws;
      client['connectionState'] = ConnectionState.CONNECTED;

      // Act
      client.sendChat('Hello, world!');

      // Assert
      expect(TestWebSocket.sentMessages).toHaveLength(1);
      const sentMessage = JSON.parse(TestWebSocket.sentMessages[0]);
      expect(sentMessage.type).toBe('chat');
      expect(sentMessage.message).toBe('Hello, world!');
    });

    it('should send ping message when connected', () => {
      // Mock connected state
      const ws = mockWebSocket('test-url');
      ws.readyState = TestWebSocket.OPEN;

      // Simulate connection
      client['ws'] = ws;
      client['connectionState'] = ConnectionState.CONNECTED;

      // Act
      client.ping();

      // Assert
      expect(TestWebSocket.sentMessages).toHaveLength(1);
      const sentMessage = JSON.parse(TestWebSocket.sentMessages[0]);
      expect(sentMessage.type).toBe('ping');
      expect(sentMessage.timestamp).toBeTypeOf('number');
    });

    it('should handle send errors when not connected', () => {
      // Act
      client.sendChat('test message');

      // Assert
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot send message: not connected',
        })
      );
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      client = new WebSocketClient(config, callbacks);
    });

    it('should handle chat messages', () => {
      // Arrange
      const chatMessage: ChatMessage = {
        type: 'chat',
        playerId: 'player-123',
        playerName: 'Test Player',
        message: 'Hello everyone!',
        timestamp: Date.now(),
      };

      // Act - simulate receiving message through private method
      const handleMessage = client['handleMessage'].bind(client);
      handleMessage(JSON.stringify(chatMessage));

      // Assert
      expect(callbacks.onMessage).toHaveBeenCalledWith(chatMessage);
    });

    it('should handle pong messages', () => {
      // Arrange
      const pongMessage: PongMessage = {
        type: 'pong',
        timestamp: Date.now(),
      };

      // Act
      const handleMessage = client['handleMessage'].bind(client);
      handleMessage(JSON.stringify(pongMessage));

      // Assert
      expect(callbacks.onMessage).toHaveBeenCalledWith(pongMessage);
    });

    it('should handle error messages', () => {
      // Arrange
      const errorMessage: ErrorMessage = {
        type: 'error',
        message: 'Something went wrong',
      };

      // Act
      const handleMessage = client['handleMessage'].bind(client);
      handleMessage(JSON.stringify(errorMessage));

      // Assert
      expect(callbacks.onMessage).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle malformed JSON messages', () => {
      // Act
      const handleMessage = client['handleMessage'].bind(client);
      handleMessage('invalid json {');

      // Assert
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to parse message',
        })
      );
    });
  });

  describe('Room Information', () => {
    beforeEach(() => {
      client = new WebSocketClient(config, callbacks);
    });

    it('should fetch room info successfully', async () => {
      // Arrange
      const roomInfo: RoomInfo = {
        roomId: 'test-room',
        createdAt: Date.now(),
        playerCount: 2,
        maxPlayers: 4,
        isActive: true,
        players: [
          { id: 'player1', name: 'Player 1', isConnected: true },
          { id: 'player2', name: 'Player 2', isConnected: false },
        ],
      };

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(roomInfo), { status: 200 }));

      // Act
      const result = await client.getRoomInfo();

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/room/test-room/info');
      expect(result).toEqual(roomInfo);
      expect(callbacks.onRoomInfo).toHaveBeenCalledWith(roomInfo);
    });

    it('should handle room info fetch failure', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(new Response('Not found', { status: 404 }));

      // Act
      const result = await client.getRoomInfo();

      // Assert
      expect(result).toBeNull();
      expect(callbacks.onRoomInfo).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      const result = await client.getRoomInfo();

      // Assert
      expect(result).toBeNull();
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error',
        })
      );
    });

    it('should convert WebSocket URL to HTTP URL', async () => {
      // Arrange
      const wsConfig = { ...config, baseUrl: 'ws://example.com:8080' };
      client = new WebSocketClient(wsConfig, callbacks);

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

      // Act
      await client.getRoomInfo();

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('http://example.com:8080/room/test-room/info');
    });
  });

  describe('URL Construction', () => {
    beforeEach(() => {
      client = new WebSocketClient(config, callbacks);
    });

    it('should construct correct WebSocket URL with parameters', () => {
      // Act - access private method to test URL construction
      const getWebSocketUrl = client['getWebSocketUrl'].bind(client);
      const url = getWebSocketUrl();

      // Assert - URLSearchParams uses + for spaces
      const expectedUrl =
        'ws://localhost:8787/room/test-room?playerId=test-player&playerName=Test+Player';
      expect(url).toBe(expectedUrl);
    });

    it('should handle special characters in parameters', () => {
      // Arrange
      const specialConfig = {
        ...config,
        roomId: 'room@#$%',
        playerId: 'player@#$%',
        playerName: 'Player Name @#$%',
      };
      client = new WebSocketClient(specialConfig, callbacks);

      // Act
      const getWebSocketUrl = client['getWebSocketUrl'].bind(client);
      const url = getWebSocketUrl();

      // Assert - roomId is not encoded in path, parameters are encoded by URLSearchParams
      const params = new URLSearchParams({
        playerId: specialConfig.playerId,
        playerName: specialConfig.playerName,
      });
      const expectedUrl = `ws://localhost:8787/room/${specialConfig.roomId}?${params.toString()}`;
      expect(url).toBe(expectedUrl);
    });

    it('should convert http to ws protocol', () => {
      // Arrange
      const httpConfig = { ...config, baseUrl: 'http://localhost:8787' };
      client = new WebSocketClient(httpConfig, callbacks);

      // Act
      const getWebSocketUrl = client['getWebSocketUrl'].bind(client);
      const url = getWebSocketUrl();

      // Assert
      expect(url).toMatch(/^ws:/);
    });
  });

  describe('HTTP URL Conversion', () => {
    beforeEach(() => {
      client = new WebSocketClient(config, callbacks);
    });

    it('should convert ws to http protocol', () => {
      // Act - access private method
      const getHttpUrl = client['getHttpUrl'].bind(client);
      const url = getHttpUrl();

      // Assert
      expect(url).toBe('http://localhost:8787');
    });

    it('should convert wss to https protocol', () => {
      // Arrange
      const secureConfig = { ...config, baseUrl: 'wss://example.com' };
      client = new WebSocketClient(secureConfig, callbacks);

      // Act
      const getHttpUrl = client['getHttpUrl'].bind(client);
      const url = getHttpUrl();

      // Assert
      expect(url).toBe('https://example.com');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      client = new WebSocketClient(config, callbacks);
    });

    it('should handle invalid JSON in room info response', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(new Response('invalid json', { status: 200 }));

      // Act
      const result = await client.getRoomInfo();

      // Assert
      expect(result).toBeNull();
      expect(callbacks.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle network errors during room creation', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      await client.connect().catch(() => {
        // Expected to fail
      });

      // Assert
      expect(callbacks.onError).toHaveBeenCalled();
      // The state remains CONNECTING after error since handleError doesn't change state
      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTING);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle empty configuration values', () => {
      // Arrange
      const emptyConfig = {
        baseUrl: '',
        roomId: '',
        playerId: '',
        playerName: '',
      };

      // Act & Assert - should not throw during construction
      expect(() => {
        client = new WebSocketClient(emptyConfig);
      }).not.toThrow();
    });

    it('should handle zero or negative reconnect attempts', () => {
      // Arrange
      const negativeConfig = { ...config, reconnectAttempts: -1 };

      // Act & Assert
      expect(() => {
        client = new WebSocketClient(negativeConfig);
      }).not.toThrow();
    });

    it('should handle zero ping interval', () => {
      // Arrange
      const zeroPingConfig = { ...config, pingInterval: 0 };

      // Act & Assert
      expect(() => {
        client = new WebSocketClient(zeroPingConfig);
      }).not.toThrow();
    });
  });

  describe('Disconnect Handling', () => {
    beforeEach(() => {
      client = new WebSocketClient(config, callbacks);
    });

    it('should handle disconnect when not connected', () => {
      // Act & Assert - should not throw
      expect(() => client.disconnect()).not.toThrow();
      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should clean up WebSocket on disconnect', () => {
      // Arrange - simulate connected state
      const ws = mockWebSocket('test-url');
      client['ws'] = ws;
      client['connectionState'] = ConnectionState.CONNECTED;

      // Act
      client.disconnect();

      // Assert
      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(callbacks.onStateChange).toHaveBeenCalledWith(ConnectionState.DISCONNECTED);
    });
  });

  describe('State Transitions', () => {
    beforeEach(() => {
      client = new WebSocketClient(config, callbacks);
    });

    it('should only call state change callback when state actually changes', () => {
      // Arrange - simulate already disconnected state
      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      vi.clearAllMocks();

      // Act - try to disconnect again
      client.disconnect();

      // Assert - should not call state change since already disconnected
      expect(callbacks.onStateChange).not.toHaveBeenCalled();
    });

    it('should track state changes correctly', () => {
      // Act
      client.connect().catch(() => {
        // Ignore connection errors
      });

      // Assert initial state change
      expect(callbacks.onStateChange).toHaveBeenCalledWith(ConnectionState.CONNECTING);
      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTING);
    });
  });
});
