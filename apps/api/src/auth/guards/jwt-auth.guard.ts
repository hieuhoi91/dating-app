import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { User } from '../../database/entities/user.entity.js';

type AccessTokenPayload = {
  sub: string;
  email: string;
};

type AuthenticatedRequest = Request & { user?: User };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    this.validateCookieRequestOrigin(request);

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const token = this.getAccessToken(request);
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục.');

    try {
      const payload =
        await this.jwt.verifyAsync<AccessTokenPayload>(token, {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          issuer: 'dating-api',
          audience: 'dating-clients',
        });
      const user = await this.users.findOneBy({ id: payload.sub });
      if (!user || user.email !== payload.email) {
        throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ.');
      }
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
  }

  private validateCookieRequestOrigin(request: AuthenticatedRequest): void {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    const cookieHeader = request.headers.cookie ?? '';
    const cookieNames = [
      this.config.get<string>('AUTH_ACCESS_COOKIE_NAME') ?? 'dating_access',
      this.config.get<string>('AUTH_REFRESH_COOKIE_NAME') ?? 'dating_refresh',
    ];
    const hasSessionCookie = cookieHeader.split(';').some((part) => {
      const cookieName = part.trim().split('=', 1)[0];
      return cookieName !== undefined && cookieNames.includes(cookieName);
    });
    if (!hasSessionCookie) return;

    const origin = request.headers.origin;
    const allowedOrigins = (
      this.config.get<string>('CORS_ORIGIN') ?? ''
    )
      .split(',')
      .map((value) => value.trim());
    if (!origin || !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Origin không được phép thực hiện yêu cầu này.');
    }
  }

  private getAccessToken(request: AuthenticatedRequest): string | undefined {
    const cookieName =
      this.config.get<string>('AUTH_ACCESS_COOKIE_NAME') ?? 'dating_access';
    const cookieHeader = request.headers.cookie;
    const cookieToken = cookieHeader
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (cookieToken) {
      try {
        return decodeURIComponent(cookieToken);
      } catch {
        return undefined;
      }
    }

    const authorization = request.headers.authorization;
    return authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;
  }
}
