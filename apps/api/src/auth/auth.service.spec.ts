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

  it('keeps a created account and reports when its verification email is rejected', async () => {
    const user = {
      id: 'new-user-id',
      email: 'person@example.com',
      emailVerified: false,
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
      [
        EmailToken,
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
    const mailer = {
      sendVerificationEmail: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('Recipient is not allowed'), {
          responseCode: 550,
        })),
    };
    const service = new AuthService(
      dataSource as never,
      {} as never,
      {} as never,
      { findOneBy: vi.fn() } as never,
      {} as never,
      {} as never,
      mailer as never,
    );

    const result = await service.register('person@example.com', 'secure-password');

    expect(result).toEqual({ user, verificationEmailSent: false });
    expect(repositories.get(User)?.save).toHaveBeenCalledTimes(1);
    expect(mailer.sendVerificationEmail).toHaveBeenCalledTimes(1);
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

  it('explains that an unverified account should use its sent verification email', async () => {
    const service = createService(false);

    await expect(
      service.register('person@example.com', 'secure-password'),
    ).rejects.toMatchObject({
      message:
        'Email này đã được đăng ký nhưng chưa xác thực. Hãy dùng nút gửi lại email xác thực bên dưới.',
    });
  });

  it('directs a verified existing account to login or password reset', async () => {
    const service = createService(true);

    await expect(
      service.register('person@example.com', 'secure-password'),
    ).rejects.toMatchObject({
      message:
        'Gmail này đã có tài khoản. Hãy đăng nhập bằng tài khoản đó hoặc chọn Quên mật khẩu nếu bạn không nhớ mật khẩu.',
    });
  });

  it('returns a conflict response for either existing account state', async () => {
    const service = createService(false);

    await expect(
      service.register('person@example.com', 'secure-password'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
