import { DurableObject } from 'cloudflare:workers';

interface PlayerInfo {
  id: string;
  name: string;
  joinedAt: number;
  isConnected: boolean;
}

interface RoomState {
  roomId: string;
  createdAt: number;
  maxPlayers: number;
  isActive: boolean;
}

export class GameRoomObject extends DurableObject<Env> {
  private connections: Map<string, WebSocket>;
  private players: Map<string, PlayerInfo>;
  private roomState: RoomState | null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.connections = new Map();
    this.players = new Map();
    this.roomState = null;

    ctx.blockConcurrencyWhile(async () => {
      this.roomState = (await ctx.storage.get<RoomState>('roomState')) || null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    const pathParts = url.pathname.split('/');

    // Handle create patterns: /room/create or /room/{roomId}/create
    if (
      pathParts[2] === 'create' ||
      pathParts[3] === 'create' ||
      url.pathname.endsWith('/room/create')
    ) {
      return this.handleCreateRoom(request);
    }

    // Handle info patterns: /room/info or /room/{roomId}/info
    if (pathParts[2] === 'info' || pathParts[3] === 'info' || url.pathname.endsWith('/room/info')) {
      return this.handleRoomInfo();
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');
    const playerName = url.searchParams.get('playerName');

    if (!playerId || !playerName) {
      return new Response('Missing playerId or playerName', { status: 400 });
    }

    if (!this.roomState) {
      return new Response('Room not created', { status: 404 });
    }

    if (this.players.size >= this.roomState.maxPlayers && !this.players.has(playerId)) {
      return new Response('Room is full', { status: 403 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    this.connections.set(playerId, server);

    const playerInfo: PlayerInfo = {
      id: playerId,
      name: playerName,
      joinedAt: Date.now(),
      isConnected: true,
    };
    this.players.set(playerId, playerInfo);

    this.broadcastMessage(
      {
        type: 'player_joined',
        playerId,
        playerName,
        playerCount: this.players.size,
      },
      playerId
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleCreateRoom(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomIdParam = url.searchParams.get('roomId');
    const roomId = roomIdParam !== null ? roomIdParam : crypto.randomUUID();
    const maxPlayersParam = url.searchParams.get('maxPlayers') || '6';
    const maxPlayers = parseInt(maxPlayersParam) || 6; // Default to 6 if NaN

    if (this.roomState) {
      return Response.json({
        success: true,
        roomId: this.roomState.roomId,
        message: 'Room already exists',
      });
    }

    this.roomState = {
      roomId,
      createdAt: Date.now(),
      maxPlayers: Math.min(Math.max(maxPlayers, 2), 6), // Clamp between 2-6 players
      isActive: true,
    };

    await this.ctx.storage.put('roomState', this.roomState);

    return Response.json({
      success: true,
      roomId,
      maxPlayers: this.roomState.maxPlayers,
    });
  }

  private async handleRoomInfo(): Promise<Response> {
    if (!this.roomState) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    return Response.json({
      roomId: this.roomState.roomId,
      createdAt: this.roomState.createdAt,
      playerCount: this.players.size,
      maxPlayers: this.roomState.maxPlayers,
      isActive: this.roomState.isActive,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isConnected: p.isConnected,
      })),
    });
  }

  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      const playerId = this.getPlayerIdByWebSocket(ws);

      if (!playerId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
        return;
      }

      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'chat':
          this.broadcastMessage({
            type: 'chat',
            playerId,
            playerName: this.players.get(playerId)?.name,
            message: data.message,
            timestamp: Date.now(),
          });
          break;

        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    const playerId = this.getPlayerIdByWebSocket(ws);

    if (playerId) {
      this.connections.delete(playerId);

      const player = this.players.get(playerId);
      if (player) {
        player.isConnected = false;

        this.broadcastMessage({
          type: 'player_left',
          playerId,
          playerName: player.name,
          playerCount: this.getConnectedPlayerCount(),
        });

        setTimeout(() => {
          if (!this.connections.has(playerId)) {
            this.players.delete(playerId);
          }
        }, 30000); // Remove player after 30 seconds if not reconnected
      }
    }

    if (this.connections.size === 0 && this.roomState) {
      this.roomState.isActive = false;
      await this.ctx.storage.put('roomState', this.roomState);
    }
  }

  private getPlayerIdByWebSocket(ws: WebSocket): string | undefined {
    for (const [playerId, connection] of this.connections) {
      if (connection === ws) {
        return playerId;
      }
    }
    return undefined;
  }

  private getConnectedPlayerCount(): number {
    return Array.from(this.players.values()).filter(p => p.isConnected).length;
  }

  private broadcastMessage(message: Record<string, unknown>, excludePlayerId?: string): void {
    const messageStr = JSON.stringify(message);

    for (const [playerId, ws] of this.connections) {
      if (playerId !== excludePlayerId) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error(`Failed to send message to player ${playerId}:`, error);
          this.connections.delete(playerId);
        }
      }
    }
  }
}
