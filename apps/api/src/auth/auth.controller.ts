import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { CredentialsDto } from './dto/credentials.dto.js';
import { EmailDto } from './dto/email.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { AuthService, type AuthTokens } from './auth.service.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import type { User } from '../database/entities/user.entity.js';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly googleOAuth: GoogleOAuthService,
  ) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() credentials: CredentialsDto) {
    const { user, verificationEmailSent } = await this.auth.register(
      credentials.email,
      credentials.password,
    );
    return {
      authenticated: false,
      verificationEmailSent,
      message: verificationEmailSent
        ? 'Tài khoản đã được tạo. Hãy kiểm tra email để xác thực trước khi đăng nhập.'
        : 'Tài khoản đã được tạo nhưng email xác thực chưa gửi được. Resend có thể đang ở chế độ thử nghiệm; hãy xác minh domain gửi email rồi bấm gửi lại bên dưới.',
      user: { id: user.id, email: user.email },
    };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() credentials: CredentialsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, tokens } = await this.auth.login(
      credentials.email,
      credentials.password,
    );
    this.setAuthCookies(response, tokens);
    return { authenticated: true, user: { id: user.id, email: user.email } };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, tokens } = await this.auth.refresh(
      this.readCookie(request, this.refreshCookieName),
    );
    this.setAuthCookies(response, tokens);
    return { authenticated: true, user: { id: user.id, email: user.email } };
  }

  @Post('verification/resend')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async resendVerification(@Body() body: EmailDto) {
    await this.auth.resendVerification(body.email);
    return {
      message:
        'Nếu tài khoản cần xác thực, hướng dẫn sẽ được gửi đến email đã đăng ký.',
    };
  }

  @Get('verify')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmail(
    @Query('token') token: string | undefined,
    @Res() response: Response,
  ) {
    if (!token) return this.redirectToWeb(response, '/auth/login?error=verify');
    try {
      const { tokens } = await this.auth.verifyEmail(token);
      this.setAuthCookies(response, tokens);
      return this.redirectToWeb(response, '/app/onboarding');
    } catch (error) {
      this.logger.warn(
        `Email verification failed: ${error instanceof Error ? error.name : 'unknown error'}`,
      );
      return this.redirectToWeb(response, '/auth/login?error=verify');
    }
  }

  @Post('password-reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestPasswordReset(@Body() body: EmailDto) {
    await this.auth.requestPasswordReset(body.email);
    return {
      message:
        'Nếu email thuộc tài khoản hợp lệ, hướng dẫn đặt lại mật khẩu sẽ được gửi.',
    };
  }

  @Post('password-reset/confirm')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async confirmPasswordReset(@Body() body: ResetPasswordDto) {
    await this.auth.resetPassword(body.token, body.password);
    return { message: 'Mật khẩu đã được cập nhật. Hãy đăng nhập lại.' };
  }

  @Get('google')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startGoogleOAuth(@Res() response: Response) {
    const state = randomBytes(32).toString('base64url');
    response.cookie(this.googleStateCookieName, state, {
      ...this.cookieOptions(10 * 60 * 1000),
      path: this.googleCallbackPath,
    });
    return response.redirect(this.googleOAuth.createAuthorizationUrl(state));
  }

  @Get('google/callback')
  @Public()
  async completeGoogleOAuth(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') providerError: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const savedState = this.readCookie(request, this.googleStateCookieName);
    response.clearCookie(this.googleStateCookieName, {
      ...this.cookieOptions(0),
      path: this.googleCallbackPath,
    });
    if (
      providerError ||
      !code ||
      !state ||
      !savedState ||
      !this.safeEqual(state, savedState)
    ) {
      return this.redirectToWeb(response, '/auth/login?error=google');
    }

    try {
      const identity = await this.googleOAuth.exchangeCode(code);
      const { user, tokens } = await this.auth.loginWithGoogle(identity);
      this.setAuthCookies(response, tokens);
      return this.redirectToWeb(
        response,
        user.emailVerified ? '/app' : '/app/onboarding',
      );
    } catch (error) {
      this.logger.warn(
        `Google OAuth callback failed: ${error instanceof Error ? error.name : 'unknown error'}`,
      );
      return this.redirectToWeb(response, '/auth/login?error=google');
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(this.readCookie(request, this.refreshCookieName));
    response.clearCookie(this.accessCookieName, this.cookieOptions(0));
    response.clearCookie(this.refreshCookieName, {
      ...this.cookieOptions(0),
      path: '/',
    });
    return { authenticated: false };
  }

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.auth.getIdentity(user.id);
  }

  @Post('socket-token')
  @HttpCode(HttpStatus.OK)
  async createSocketToken(@CurrentUser() user: User) {
    return { accessToken: await this.auth.createRealtimeToken(user) };
  }

  private get accessCookieName(): string {
    return this.config.get<string>('AUTH_ACCESS_COOKIE_NAME') ?? 'dating_access';
  }

  private get refreshCookieName(): string {
    return this.config.get<string>('AUTH_REFRESH_COOKIE_NAME') ?? 'dating_refresh';
  }

  private get googleStateCookieName(): string {
    return (
      this.config.get<string>('AUTH_GOOGLE_STATE_COOKIE_NAME') ??
      'dating_google_state'
    );
  }

  private get googleCallbackPath(): string {
    const callbackUrl = this.config.get<string>('GOOGLE_CALLBACK_URL');
    return callbackUrl ? new URL(callbackUrl).pathname : '/auth/callback';
  }

  private setAuthCookies(response: Response, tokens: AuthTokens): void {
    response.cookie(this.accessCookieName, tokens.accessToken, {
      ...this.cookieOptions(15 * 60 * 1000),
      path: '/',
    });
    response.cookie(this.refreshCookieName, tokens.refreshToken, {
      ...this.cookieOptions(30 * 24 * 60 * 60 * 1000),
      path: '/',
    });
  }

  private cookieOptions(maxAge: number) {
    const sameSite = this.config.get<'strict' | 'lax' | 'none'>(
      'AUTH_COOKIE_SAME_SITE',
      'lax',
    );
    const domain = this.config.get<string>('AUTH_COOKIE_DOMAIN');
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production' || sameSite === 'none',
      sameSite,
      ...(domain ? { domain } : {}),
      maxAge,
    };
  }

  private readCookie(request: Request, name: string): string | undefined {
    const value = request.headers.cookie
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.slice(name.length + 1);
    if (!value) return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }

  private safeEqual(first: string, second: string): boolean {
    const firstBuffer = Buffer.from(first);
    const secondBuffer = Buffer.from(second);
    return (
      firstBuffer.length === secondBuffer.length &&
      timingSafeEqual(firstBuffer, secondBuffer)
    );
  }

  private redirectToWeb(response: Response, path: string) {
    const baseUrl = this.config.get<string>('WEB_APP_URL');
    if (!baseUrl) {
      this.logger.error('WEB_APP_URL is required for authentication redirects.');
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).send({
        error: 'Backend chưa cấu hình địa chỉ web để hoàn tất xác thực.',
      });
    }
    return response.redirect(new URL(path, baseUrl).toString());
  }
}
