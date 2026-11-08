import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GoogleIdentity = {
  subject: string;
  email: string;
};

type GoogleTokenResponse = {
  access_token?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly config: ConfigService) {}

  createAuthorizationUrl(state: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  async exchangeCode(code: string): Promise<GoogleIdentity> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      grant_type: 'authorization_code',
    });
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) {
      throw new ServiceUnavailableException(
        'Google không thể xác thực yêu cầu đăng nhập.',
      );
    }

    const tokenPayload =
      (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenPayload.access_token) {
      throw new ServiceUnavailableException(
        'Google không trả về thông tin xác thực hợp lệ.',
      );
    }

    const userResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!userResponse.ok) {
      throw new ServiceUnavailableException(
        'Không thể xác minh tài khoản Google.',
      );
    }

    const userInfo = (await userResponse.json()) as GoogleUserInfo;
    if (
      !userInfo.sub ||
      !userInfo.email ||
      userInfo.email_verified !== true
    ) {
      throw new ServiceUnavailableException(
        'Google cần xác nhận địa chỉ email trước khi đăng nhập.',
      );
    }

    return {
      subject: userInfo.sub,
      email: userInfo.email.trim().toLowerCase(),
    };
  }
}
