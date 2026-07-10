// backend/src/events/events.gateway.ts
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
    origin: '*',
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
  private readonly userRooms = new Map<string, string>();
  private isShuttingDown = false;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  // INIT
  // ============================================================
  afterInit(server: Server) {
    const corsOrigin = this.configService.get<string>('cors.origin') || '*';
    this.logger.log(`WebSocket Gateway initialized with CORS origin: ${corsOrigin}`);
  }

  // ============================================================
  // CONNECTION
  // ============================================================
  async handleConnection(client: Socket) {
    if (this.isShuttingDown) {
      client.disconnect();
      return;
    }

    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn(`Client ${client.id} disconnected: Invalid token (no sub)`);
        client.disconnect();
        return;
      }

      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      this.connectedClients.get(userId)?.add(client.id);

      const room = `user:${userId}`;
      client.join(room);
      this.userRooms.set(client.id, room);

      this.logger.log(
        `Client ${client.id} connected for user ${userId} (Total: ${this.getTotalConnections()})`,
      );

      client.emit('connected', { userId, timestamp: new Date().toISOString() });
    } catch (error: any) {
      this.logger.warn(
        `Client ${client.id} disconnected: Authentication failed - ${error.message}`,
      );
      client.disconnect();
    }
  }

  // ============================================================
  // DISCONNECT
  // ============================================================
  handleDisconnect(client: Socket) {
    this.userRooms.delete(client.id);

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
  // TOKEN EXTRACTION
  // ============================================================
  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const parsed = parse(cookies);
      if (parsed['access_token']) return parsed['access_token'];
      if (parsed['token']) return parsed['token'];
    }

    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  // ============================================================
  // NOTIFY USER
  // ============================================================
  notifyUser(userId: string | number, event: string, data: any): void {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, data);
    this.logger.debug(`Notified user ${userId} on event "${event}"`);
  }

  // ============================================================
  // NOTIFY ALL
  // ============================================================
  notifyAll(event: string, data: any): void {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted event "${event}" to all clients`);
  }

  // ============================================================
  // NOTIFY ROOM
  // ============================================================
  notifyRoom(room: string, event: string, data: any): void {
    this.server.to(room).emit(event, data);
    this.logger.debug(`Notified room "${room}" on event "${event}"`);
  }

  // ============================================================
  // GET CONNECTED CLIENTS
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
  // MESSAGE HANDLERS
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
  // ✅ FIXED: GRACEFUL SHUTDOWN
  // ============================================================
  async onModuleDestroy() {
    this.logger.log('Closing WebSocket connections...');
    this.isShuttingDown = true;

    // Disconnect all clients
    for (const [userId, clients] of this.connectedClients) {
      for (const clientId of clients) {
        const socket = this.server.sockets.sockets.get(clientId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }

    this.connectedClients.clear();
    this.userRooms.clear();

    // Close the server if it exists
    if (this.server && typeof this.server.close === 'function') {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          this.logger.log('WebSocket server closed');
          resolve();
        });
      });
    } else {
      this.logger.log('WebSocket server already closed or not initialized');
    }
  }
}