import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppController } from './../src/app.controller.js';
import { AuthController } from './../src/auth/auth.controller.js';
import { AuthService } from './../src/auth/auth.service.js';
import { GoogleOAuthService } from './../src/auth/google-oauth.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const query = vi.fn();
  const auth = {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };
  const googleOAuth = {
    exchangeCode: vi.fn(),
    createAuthorizationUrl: vi.fn(),
  };
  const config = {
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
  };

  beforeEach(async () => {
    query.mockReset().mockResolvedValue([{ '?column?': 1 }]);
    auth.register.mockReset().mockResolvedValue({
      user: {
        id: 'user-id',
        email: 'person@example.com',
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, AuthController],
      providers: [
        { provide: DataSource, useValue: { query } },
        { provide: AuthService, useValue: auth },
        { provide: GoogleOAuthService, useValue: googleOAuth },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'ok' });
  });

  it('creates an account, authenticates it, and returns auth cookies without email verification', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'person@example.com', password: 'a-strong-password' })
      .expect(201)
      .expect({
        authenticated: true,
        accountCreated: true,
        message: 'Đăng ký thành công. Hãy hoàn tất hồ sơ của bạn.',
        user: { id: 'user-id', email: 'person@example.com' },
      });

    expect(auth.register).toHaveBeenCalledWith(
      'person@example.com',
      'a-strong-password',
    );
    expect(response.headers['set-cookie']).toHaveLength(2);
  });

  it('rejects malformed registration data before calling the auth service', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'invalid-email', password: 'short' })
      .expect(400);

    expect(auth.register).not.toHaveBeenCalled();
  });

  afterEach(async () => {
    await app.close();
  });
});
