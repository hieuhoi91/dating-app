import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from '../database/entities/profile.entity.js';
import { RefreshSession } from '../database/entities/refresh-session.entity.js';
import { User } from '../database/entities/user.entity.js';
import { UserPersonalData } from '../database/entities/user-personal-data.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailToken } from '../database/entities/email-token.entity.js';
import { MailerService } from '../notifications/mailer.service.js';
import { GoogleOAuthService } from './google-oauth.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Profile,
      RefreshSession,
      UserPersonalData,
      EmailToken,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailerService, GoogleOAuthService],
  exports: [AuthService],
})
export class AuthModule {}
