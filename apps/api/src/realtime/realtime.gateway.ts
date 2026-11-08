import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Server, Socket } from 'socket.io';

type AccessTokenPayload = {
  sub?: string;
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => {
      const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
        .split(',')
        .map((allowedOrigin) => allowedOrigin.trim())
        .filter(Boolean);
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const authToken = client.handshake.auth?.token;
    const authorization = client.handshake.headers.authorization;
    const cookieHeader = client.handshake.headers.cookie;
    const accessCookieName =
      this.config.get<string>('AUTH_ACCESS_COOKIE_NAME') ?? 'dating_access';
    const cookieToken = cookieHeader
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${accessCookieName}=`))
      ?.slice(accessCookieName.length + 1);
    const token =
      typeof authToken === 'string'
        ? authToken
        : authorization?.startsWith('Bearer ')
          ? authorization.slice('Bearer '.length)
          : cookieToken;

    if (!token) {
      client.disconnect(true);
      return;
    }

    void this.jwtService
      .verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        issuer: 'dating-api',
        audience: 'dating-clients',
      })
      .then((payload) => {
        if (!payload.sub) {
          client.disconnect(true);
          return;
        }

        client.data.userId = payload.sub;
        void client.join(`user:${payload.sub}`);
        client.emit('realtime:ready', { userId: payload.sub });
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Rejected Socket.IO authentication: ${error instanceof Error ? error.name : 'unknown error'}`,
        );
        client.disconnect(true);
      });
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToUsers(userIds: string[], event: string, payload: unknown): void {
    for (const userId of new Set(userIds)) {
      this.emitToUser(userId, event, payload);
    }
  }
}
