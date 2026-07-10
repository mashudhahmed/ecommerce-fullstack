// src/events/events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { parse } from 'cookie';

@WebSocketGateway({
  cors: {
    origin: '*', // Will be overridden by config
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
@Injectable()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly connectedClients = new Map<string, Set<string>>();
  private readonly userRooms = new Map<string, string>(); // userId -> room name

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  // INIT – Configure CORS from config
  // ============================================================
  afterInit(server: Server) {
    const corsOrigin = this.configService.get<string>('cors.origin') || '*';
    this.logger.log(`WebSocket Gateway initialized with CORS origin: ${corsOrigin}`);
    // Dynamically update CORS if needed (socket.io already configured via decorator)
  }

  // ============================================================
  // CONNECTION – Authenticate and join user room
  // ============================================================
  async handleConnection(client: Socket) {
    try {
      // Extract token from multiple sources
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn(`Client ${client.id} disconnected: Invalid token (no sub)`);
        client.disconnect();
        return;
      }

      // Store client connection
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      this.connectedClients.get(userId)?.add(client.id);

      // Join user to their personal room (for efficient broadcasting)
      const room = `user:${userId}`;
      client.join(room);
      this.userRooms.set(client.id, room);

      this.logger.log(
        `Client ${client.id} connected for user ${userId} (Total: ${this.getTotalConnections()})`,
      );

      // Send a welcome message (optional)
      client.emit('connected', { userId, timestamp: new Date().toISOString() });
    } catch (error: any) {
      this.logger.warn(
        `Client ${client.id} disconnected: Authentication failed - ${error.message}`,
      );
      client.disconnect();
    }
  }

  // ============================================================
  // DISCONNECT – Clean up resources
  // ============================================================
  handleDisconnect(client: Socket) {
    // Remove from user room mapping
    this.userRooms.delete(client.id);

    // Remove from connected clients map
    for (const [userId, clients] of this.connectedClients) {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.connectedClients.delete(userId);
        }
        break;
      }
    }

    this.logger.log(
      `Client ${client.id} disconnected (Remaining: ${this.getTotalConnections()})`,
    );
  }

  // ============================================================
  // TOKEN EXTRACTION – from cookies, headers, or query
  // ============================================================
  private extractToken(client: Socket): string | null {
    // 1. Try from handshake auth (client-side)
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    // 2. Try from cookies (if present)
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const parsed = parse(cookies);
      if (parsed['access_token']) return parsed['access_token'];
      if (parsed['token']) return parsed['token'];
    }

    // 3. Try from Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 4. Try from query string (for testing)
    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  // ============================================================
  // BROADCAST TO SPECIFIC USER (by userId)
  // ============================================================
  notifyUser(userId: string | number, event: string, data: any): void {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, data);
    this.logger.debug(`Notified user ${userId} on event "${event}"`);
  }

  // ============================================================
  // BROADCAST TO ALL CONNECTED CLIENTS (admin announcements)
  // ============================================================
  notifyAll(event: string, data: any): void {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted event "${event}" to all clients`);
  }

  // ============================================================
  // BROADCAST TO A ROOM (e.g., order updates for a vendor)
  // ============================================================
  notifyRoom(room: string, event: string, data: any): void {
    this.server.to(room).emit(event, data);
    this.logger.debug(`Notified room "${room}" on event "${event}"`);
  }

  // ============================================================
  // GET CONNECTION STATS (for monitoring)
  // ============================================================
  getConnectedClients(): { total: number; users: string[] } {
    const users = Array.from(this.connectedClients.keys());
    return {
      total: users.length,
      users,
    };
  }

  private getTotalConnections(): number {
    let total = 0;
    for (const clients of this.connectedClients.values()) {
      total += clients.size;
    }
    return total;
  }

  // ============================================================
  // MESSAGE HANDLERS (client -> server)
  // ============================================================

  @SubscribeMessage('ping')
  handlePing(client: Socket): { event: string; data: { pong: string; timestamp: string } } {
    return {
      event: 'pong',
      data: {
        pong: 'pong',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('health')
  handleHealth(client: Socket): { event: string; data: { status: string; timestamp: string } } {
    return {
      event: 'health',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { room: string }): { event: string; data: any } {
    if (payload?.room && typeof payload.room === 'string') {
      client.join(payload.room);
      this.logger.log(`Client ${client.id} subscribed to room "${payload.room}"`);
      return {
        event: 'subscribed',
        data: { room: payload.room, success: true },
      };
    }
    return {
      event: 'error',
      data: { message: 'Invalid room name' },
    };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { room: string }): { event: string; data: any } {
    if (payload?.room && typeof payload.room === 'string') {
      client.leave(payload.room);
      this.logger.log(`Client ${client.id} unsubscribed from room "${payload.room}"`);
      return {
        event: 'unsubscribed',
        data: { room: payload.room, success: true },
      };
    }
    return {
      event: 'error',
      data: { message: 'Invalid room name' },
    };
  }

  // ============================================================
  // GRACEFUL SHUTDOWN
  // ============================================================
  async onModuleDestroy() {
    this.logger.log('Closing WebSocket connections...');
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(() => {
          this.logger.log('WebSocket server closed');
          resolve(null);
        });
      });
    }
    this.connectedClients.clear();
    this.userRooms.clear();
  }
}