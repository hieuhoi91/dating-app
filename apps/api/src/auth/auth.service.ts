import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHash,
  randomBytes,
} from 'node:crypto';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import { EmailToken, type EmailTokenType } from '../database/entities/email-token.entity.js';
import { Profile } from '../database/entities/profile.entity.js';
import { RefreshSession } from '../database/entities/refresh-session.entity.js';
import { User } from '../database/entities/user.entity.js';
import { UserPersonalData } from '../database/entities/user-personal-data.entity.js';
import { MailerService } from '../notifications/mailer.service.js';
import type { GoogleIdentity } from './google-oauth.service.js';
import { hashPassword, verifyPassword } from './utils/password-hasher.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH = `scrypt$v1$${'0'.repeat(32)}$${'0'.repeat(128)}`;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshSession)
    private readonly sessions: Repository<RefreshSession>,
    @InjectRepository(EmailToken)
    private readonly emailTokens: Repository<EmailToken>,
    private readonly mailer: MailerService,
  ) {}

  async register(
    emailInput: string,
    password: string,
  ): Promise<{ user: User; verificationEmailSent: boolean }> {
    const email = emailInput.trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    const rawToken = this.createRawToken();

    let user: User;
    try {
      user = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const profiles = manager.getRepository(Profile);
        const personalData = manager.getRepository(UserPersonalData);
        const emailTokens = manager.getRepository(EmailToken);
        const createdUser = await users.save(users.create({ email, passwordHash }));
        await profiles.save(
          profiles.create({
            userId: createdUser.id,
            username: null,
            displayName: '',
            gender: null,
            bio: '',
            coarseLocation: null,
            isComplete: false,
          }),
        );
        await personalData.save(
          personalData.create({
            userId: createdUser.id,
            dateOfBirth: null,
            latitude: null,
            longitude: null,
          }),
        );
        await emailTokens.save(
          emailTokens.create({
            userId: createdUser.id,
            tokenHash: this.hashToken(rawToken),
            type: 'verification',
            expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
            consumedAt: null,
          }),
        );
        return createdUser;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const existingUser = await this.users.findOneBy({ email });
        if (existingUser && !existingUser.emailVerified) {
          throw new ConflictException(
            'Email này đã được đăng ký nhưng chưa xác thực. Hãy dùng nút gửi lại email xác thực bên dưới.',
          );
        }
        throw new ConflictException(
          'Gmail này đã có tài khoản. Hãy đăng nhập bằng tài khoản đó hoặc chọn Quên mật khẩu nếu bạn không nhớ mật khẩu.',
        );
      }
      throw error;
    }

    try {
      await this.mailer.sendVerificationEmail(user.email, rawToken);
      return { user, verificationEmailSent: true };
    } catch (error) {
      this.logger.error(
        'Account was created, but its verification email could not be sent.',
        error instanceof Error ? error.name : 'Unknown email delivery error',
      );
      return { user, verificationEmailSent: false };
    }
  }

  async login(emailInput: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.users.findOneBy({
      email: emailInput.trim().toLowerCase(),
    });
    const passwordMatches = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Vui lòng xác thực email trước khi đăng nhập.',
      );
    }
    return { user, tokens: await this.createSession(user) };
  }

  async resendVerification(emailInput: string): Promise<void> {
    const user = await this.users.findOneBy({
      email: emailInput.trim().toLowerCase(),
    });
    if (!user || user.emailVerified) return;
    try {
      await this.sendEmailToken(user, 'verification', VERIFICATION_TTL_MS);
    } catch (error) {
      this.logger.error(
        'Could not resend an account verification email.',
        error instanceof Error ? error.name : 'Unknown email delivery error',
      );
      throw new ServiceUnavailableException(
        'Không gửi được email xác thực. Resend có thể đang ở chế độ thử nghiệm: hãy xác minh domain gửi email và dùng địa chỉ gửi thuộc domain đó, sau đó thử gửi lại.',
      );
    }
  }

  async verifyEmail(rawToken: string): Promise<{ user: User; tokens: AuthTokens }> {
    const tokenHash = this.hashToken(rawToken);
    const user = await this.dataSource.transaction(async (manager) => {
      const emailTokens = manager.getRepository(EmailToken);
      const token = await emailTokens.findOne({
        where: {
          tokenHash,
          type: 'verification',
          consumedAt: IsNull(),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!token || token.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException(
          'Liên kết xác thực không hợp lệ hoặc đã hết hạn.',
        );
      }

      const users = manager.getRepository(User);
      const verifiedUser = await users.findOneByOrFail({ id: token.userId });
      verifiedUser.emailVerified = true;
      token.consumedAt = new Date();
      await users.save(verifiedUser);
      await emailTokens.save(token);
      return verifiedUser;
    });

    return { user, tokens: await this.createSession(user) };
  }

  async requestPasswordReset(emailInput: string): Promise<void> {
    const user = await this.users.findOneBy({
      email: emailInput.trim().toLowerCase(),
      emailVerified: true,
    });
    if (!user) return;
    await this.sendEmailToken(user, 'password_reset', PASSWORD_RESET_TTL_MS);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const passwordHash = await hashPassword(newPassword);
    await this.dataSource.transaction(async (manager) => {
      const emailTokens = manager.getRepository(EmailToken);
      const token = await emailTokens.findOne({
        where: {
          tokenHash,
          type: 'password_reset',
          consumedAt: IsNull(),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!token || token.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException(
          'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
        );
      }

      await manager.getRepository(User).update(
        { id: token.userId },
        { passwordHash },
      );
      await manager.getRepository(RefreshSession).update(
        { userId: token.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      token.consumedAt = new Date();
      await emailTokens.save(token);
    });
  }

  async loginWithGoogle(
    identity: GoogleIdentity,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const existingByGoogleSubject = await users.findOneBy({
        googleSubject: identity.subject,
      });
      if (existingByGoogleSubject) {
        if (existingByGoogleSubject.email !== identity.email) {
          throw new ConflictException(
            'Tài khoản Google đã được liên kết với một email khác.',
          );
        }
        return existingByGoogleSubject;
      }

      let existingByEmail = await users.findOneBy({ email: identity.email });
      if (existingByEmail?.googleSubject) {
        throw new ConflictException(
          'Email này đã được liên kết với một tài khoản Google khác.',
        );
      }
      if (existingByEmail) {
        existingByEmail.googleSubject = identity.subject;
        existingByEmail.emailVerified = true;
        existingByEmail = await users.save(existingByEmail);
      } else {
        existingByEmail = await users.save(
          users.create({
            email: identity.email,
            passwordHash: null,
            googleSubject: identity.subject,
            emailVerified: true,
          }),
        );
      }

      const profiles = manager.getRepository(Profile);
      if (!(await profiles.exists({ where: { userId: existingByEmail.id } }))) {
        await profiles.save(
          profiles.create({
            userId: existingByEmail.id,
            username: null,
            displayName: '',
            gender: null,
            bio: '',
            coarseLocation: null,
            isComplete: false,
          }),
        );
      }
      const personalData = manager.getRepository(UserPersonalData);
      if (
        !(await personalData.exists({
          where: { userId: existingByEmail.id },
        }))
      ) {
        await personalData.save(
          personalData.create({
            userId: existingByEmail.id,
            dateOfBirth: null,
            latitude: null,
            longitude: null,
          }),
        );
      }
      return existingByEmail;
    });

    return { user, tokens: await this.createSession(user) };
  }

  async refresh(rawToken: string | undefined): Promise<{ user: User; tokens: AuthTokens }> {
    if (!rawToken) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');

    const oldTokenHash = this.hashToken(rawToken);
    const newRefreshToken = randomBytes(48).toString('base64url');
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const user = await this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(RefreshSession);
      const session = await sessions.findOne({
        where: { tokenHash: oldTokenHash, revokedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session || session.expiresAt.getTime() <= Date.now()) {
        if (session) {
          session.revokedAt = new Date();
          await sessions.save(session);
        }
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      const nextSession = sessions.create({
        userId: session.userId,
        tokenHash: this.hashToken(newRefreshToken),
        expiresAt: newExpiresAt,
        revokedAt: null,
      });
      session.revokedAt = new Date();
      await sessions.save([session, nextSession]);
      return manager.getRepository(User).findOneByOrFail({ id: session.userId });
    });

    return {
      user,
      tokens: {
        accessToken: await this.createAccessToken(user),
        refreshToken: newRefreshToken,
      },
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.sessions.update(
      { tokenHash: this.hashToken(rawToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async getIdentity(userId: string) {
    const [user, profile, personalData] = await Promise.all([
      this.users.findOneByOrFail({ id: userId }),
      this.dataSource.getRepository(Profile).findOneByOrFail({ userId }),
      this.dataSource
        .getRepository(UserPersonalData)
        .findOneByOrFail({ userId }),
    ]);

    return {
      user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
      profile: {
        id: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        gender: profile.gender,
        bio: profile.bio,
        coarseLocation: profile.coarseLocation,
        dateOfBirth: personalData.dateOfBirth,
        latitude: personalData.latitude,
        longitude: personalData.longitude,
        isComplete: profile.isComplete,
      },
    };
  }

  createRealtimeToken(user: User): Promise<string> {
    return this.createAccessToken(user);
  }

  private async createSession(user: User): Promise<AuthTokens> {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        revokedAt: null,
      }),
    );
    return {
      accessToken: await this.createAccessToken(user),
      refreshToken,
    };
  }

  private async sendEmailToken(
    user: User,
    type: EmailTokenType,
    expiresInMs: number,
  ): Promise<void> {
    const rawToken = this.createRawToken();
    await this.dataSource.transaction(async (manager) => {
      const tokens = manager.getRepository(EmailToken);
      await tokens.update(
        { userId: user.id, type, consumedAt: IsNull() },
        { consumedAt: new Date() },
      );
      await tokens.save(
        tokens.create({
          userId: user.id,
          tokenHash: this.hashToken(rawToken),
          type,
          expiresAt: new Date(Date.now() + expiresInMs),
          consumedAt: null,
        }),
      );
    });

    if (type === 'verification') {
      await this.mailer.sendVerificationEmail(user.email, rawToken);
    } else {
      await this.mailer.sendPasswordResetEmail(user.email, rawToken);
    }
  }

  private createRawToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private createAccessToken(user: User): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
        issuer: 'dating-api',
        audience: 'dating-clients',
      },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = error.driverError as { code?: string };
    return driverError.code === '23505';
  }
}
