import { GameRoomObject } from './game-room-object';

export { GameRoomObject };

export default {
  async fetch<CfHostMetadata = unknown>(
    request: Request<CfHostMetadata, IncomingRequestCfProperties<CfHostMetadata>>,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS for development
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
        },
      });
    }

    // Extract room ID from path or query parameter
    const pathParts = url.pathname.split('/');
    let roomId = url.searchParams.get('roomId');

    // Extract room ID from path patterns like /room/{roomId}/create or /room/{roomId}/info
    if (!roomId && pathParts[1] === 'room' && pathParts[2]) {
      if (pathParts[3] && ['create', 'info'].includes(pathParts[3])) {
        // Pattern: /room/{roomId}/create or /room/{roomId}/info
        roomId = pathParts[2];
      } else if (['create', 'info'].includes(pathParts[2])) {
        // Pattern: /room/create or /room/info (no room ID in path)
        // For create operations, let the Durable Object generate UUID
        if (pathParts[2] === 'create') {
          roomId = crypto.randomUUID(); // Generate UUID for new rooms
        } else {
          roomId = 'default'; // For info operations without room ID
        }
      } else {
        // Pattern: /room/{roomId} (room ID only)
        roomId = pathParts[2];
      }
    }

    if (!roomId) {
      roomId = 'default';
    }

    // Create a Durable Object ID for the specific room
    const id: DurableObjectId = env.GAME_ROOM_OBJECT.idFromName(roomId);
    const stub = env.GAME_ROOM_OBJECT.get(id);

    // Create new URL with extracted room ID as query parameter for the Durable Object
    const forwardUrl = new URL(request.url);
    if (!forwardUrl.searchParams.has('roomId')) {
      forwardUrl.searchParams.set('roomId', roomId);
    }

    // Create new request with modified URL
    const forwardRequest = new Request(forwardUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    // Forward the modified request to the Durable Object
    const response = await stub.fetch(forwardRequest);

    // Add CORS headers for development
    const corsResponse = new Response(response.body, response);
    corsResponse.headers.set('Access-Control-Allow-Origin', '*');
    corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Upgrade, Connection');

    return corsResponse;
  },
} satisfies ExportedHandler<Env>;
