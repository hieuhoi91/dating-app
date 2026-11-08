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
      verificationEmailSent: true,
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

  it('creates an account and asks the user to verify their email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'person@example.com', password: 'a-strong-password' })
      .expect(201)
      .expect({
        authenticated: false,
        verificationEmailSent: true,
        message:
          'Tài khoản đã được tạo. Hãy kiểm tra email để xác thực trước khi đăng nhập.',
        user: { id: 'user-id', email: 'person@example.com' },
      });

    expect(auth.register).toHaveBeenCalledWith(
      'person@example.com',
      'a-strong-password',
    );
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('explains that an account was created when its verification email could not be sent', async () => {
    auth.register.mockResolvedValueOnce({
      user: {
        id: 'user-id',
        email: 'person@example.com',
      },
      verificationEmailSent: false,
    });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'person@example.com', password: 'a-strong-password' })
      .expect(201)
      .expect({
        authenticated: false,
        verificationEmailSent: false,
        message:
          'Tài khoản đã được tạo nhưng email xác thực chưa gửi được. Resend có thể đang ở chế độ thử nghiệm; hãy xác minh domain gửi email rồi bấm gửi lại bên dưới.',
        user: { id: 'user-id', email: 'person@example.com' },
      });
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
