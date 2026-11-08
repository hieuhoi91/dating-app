import {
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { EmailToken } from '../database/entities/email-token.entity.js';
import { Profile } from '../database/entities/profile.entity.js';
import { User } from '../database/entities/user.entity.js';
import { UserPersonalData } from '../database/entities/user-personal-data.entity.js';
import { AuthService } from './auth.service.js';

describe('AuthService registration conflicts', () => {
  function createService(emailVerified: boolean) {
    const duplicateError = new QueryFailedError(
      'INSERT INTO users',
      [],
      { code: '23505' },
    );
    const service = new AuthService(
      { transaction: vi.fn().mockRejectedValue(duplicateError) } as never,
      {} as never,
      {} as never,
      {
        findOneBy: vi.fn().mockResolvedValue({
          email: 'person@example.com',
          emailVerified,
        }),
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return service;
  }

  it('creates a verified account without sending verification email', async () => {
    const user = {
      id: 'new-user-id',
      email: 'person@example.com',
      emailVerified: true,
    };
    const repositories = new Map([
      [
        User,
        {
          create: vi.fn((input) => input),
          save: vi.fn().mockResolvedValue(user),
        },
      ],
      [
        Profile,
        {
          create: vi.fn((input) => input),
          save: vi.fn().mockResolvedValue({}),
        },
      ],
      [
        UserPersonalData,
        {
          create: vi.fn((input) => input),
          save: vi.fn().mockResolvedValue({}),
        },
      ],
    ]);
    const manager = {
      getRepository: vi.fn((entity: unknown) => repositories.get(entity as never)),
    };
    const dataSource = {
      transaction: vi.fn((callback: (manager: typeof manager) => unknown) =>
        callback(manager),
      ),
    };
    const sessions = {
      create: vi.fn((input) => input),
      save: vi.fn().mockResolvedValue({}),
    };
    const mailer = { sendVerificationEmail: vi.fn() };
    const service = new AuthService(
      dataSource as never,
      { signAsync: vi.fn().mockResolvedValue('access-token') } as never,
      { getOrThrow: vi.fn(() => 'secret') } as never,
      { findOneBy: vi.fn() } as never,
      sessions as never,
      {} as never,
      mailer as never,
    );

    const result = await service.register('person@example.com', 'secure-password');

    expect(result.user).toEqual(user);
    expect(result.tokens).toMatchObject({
      accessToken: 'access-token',
      refreshToken: expect.any(String),
    });
    expect(repositories.get(User)?.save).toHaveBeenCalledTimes(1);
    expect(repositories.get(User)?.create).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerified: true }),
    );
    expect(sessions.save).toHaveBeenCalledOnce();
    expect(manager.getRepository).not.toHaveBeenCalledWith(EmailToken);
    expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('uses the same login error for an unregistered email', async () => {
    const service = new AuthService(
      {} as never,
      {} as never,
      {} as never,
      { findOneBy: vi.fn().mockResolvedValue(null) } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.login('missing@example.com', 'secure-password'),
    ).rejects.toMatchObject({
      message: 'Email hoặc mật khẩu không chính xác.',
    });
  });

  it('reports an incorrect password with the generic login error', async () => {
    const { hashPassword } = await import('./utils/password-hasher.js');
    const user = {
      id: 'existing-user-id',
      email: 'person@example.com',
      passwordHash: await hashPassword('correct-password'),
      emailVerified: true,
    };
    const service = new AuthService(
      {} as never,
      {} as never,
      {} as never,
      { findOneBy: vi.fn().mockResolvedValue(user) } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.login('person@example.com', 'incorrect-password'),
    ).rejects.toMatchObject({
      message: 'Email hoặc mật khẩu không chính xác.',
    });
  });

  it('allows an existing unverified account to sign in with its password', async () => {
    const { hashPassword } = await import('./utils/password-hasher.js');
    const user = {
      id: 'old-user-id',
      email: 'person@example.com',
      passwordHash: await hashPassword('secure-password'),
      emailVerified: false,
    };
    const sessions = {
      create: vi.fn((input) => input),
      save: vi.fn().mockResolvedValue({}),
    };
    const service = new AuthService(
      {} as never,
      { signAsync: vi.fn().mockResolvedValue('access-token') } as never,
      { getOrThrow: vi.fn(() => 'secret') } as never,
      { findOneBy: vi.fn().mockResolvedValue(user) } as never,
      sessions as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.login('person@example.com', 'secure-password'),
    ).resolves.toMatchObject({
      user,
      tokens: { accessToken: 'access-token' },
    });
  });

  describe('AuthService verification email resend', () => {
    function createResendService(sendEmail: ReturnType<typeof vi.fn>) {
      const user = {
        id: 'user-id',
        email: 'person@example.com',
        emailVerified: false,
      };
      const tokenRepository = {
        create: vi.fn((token) => token),
        save: vi.fn().mockResolvedValue({}),
      };
      const dataSource = {
        transaction: vi.fn((callback: (manager: unknown) => unknown) =>
          callback({
            getRepository: vi.fn(() => tokenRepository),
          }),
        ),
      };
      const emailTokens = {
        delete: vi.fn().mockResolvedValue({ affected: 1 }),
        update: vi.fn().mockResolvedValue({ affected: 1 }),
      };
      const mailer = {
        sendVerificationEmail: sendEmail,
        sendPasswordResetEmail: vi.fn(),
      };
      const service = new AuthService(
        dataSource as never,
        {} as never,
        { get: vi.fn(() => 'smtp.gmail.com') } as never,
        { findOneBy: vi.fn().mockResolvedValue(user) } as never,
        {} as never,
        emailTokens as never,
        mailer as never,
      );
      return { service, emailTokens, tokenRepository };
    }

    it('keeps existing verification links usable when resending fails', async () => {
      const { service, emailTokens, tokenRepository } = createResendService(
        vi.fn().mockRejectedValue(new Error('SMTP rejected the message')),
      );

      await expect(
        service.resendVerification('person@example.com'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(tokenRepository.save).toHaveBeenCalledOnce();
      expect(emailTokens.delete).toHaveBeenCalledOnce();
      expect(emailTokens.update).not.toHaveBeenCalled();
    });

    it('consumes older verification links only after a resend succeeds', async () => {
      const { service, emailTokens } = createResendService(
        vi.fn().mockResolvedValue(undefined),
      );

      await service.resendVerification('person@example.com');

      expect(emailTokens.delete).not.toHaveBeenCalled();
      expect(emailTokens.update).toHaveBeenCalledOnce();
    });
  });

  it('reports that an existing unverified email is already registered', async () => {
    const service = createService(false);

    await expect(
      service.register('person@example.com', 'secure-password'),
    ).rejects.toMatchObject({
      message:
        'Gmail này đã tồn tại. Hãy đăng nhập bằng tài khoản đó hoặc chọn Quên mật khẩu nếu bạn không nhớ mật khẩu.',
    });
  });

  it('directs a verified existing account to login or password reset', async () => {
    const service = createService(true);

    await expect(
      service.register('person@example.com', 'secure-password'),
    ).rejects.toMatchObject({
      message:
        'Gmail này đã tồn tại. Hãy đăng nhập bằng tài khoản đó hoặc chọn Quên mật khẩu nếu bạn không nhớ mật khẩu.',
    });
  });

  it('returns a conflict response for either existing account state', async () => {
    const service = createService(false);

    await expect(
      service.register('person@example.com', 'secure-password'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
