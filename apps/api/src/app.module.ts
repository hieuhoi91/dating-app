import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { User } from './database/entities/user.entity.js';
import { CreateIdentitySchema1762580000000 } from './database/migrations/1762580000000-CreateIdentitySchema.js';
import { CreatePlatformTables1762600000000 } from './database/migrations/1762600000000-CreatePlatformTables.js';
import { CreateSocialFeatures1762650000000 } from './database/migrations/1762650000000-CreateSocialFeatures.js';
import { CreateCoupleSchema1762660000000 } from './database/migrations/1762660000000-CreateCoupleSchema.js';
import { CreateCloudinaryDeletionQueue1762670000000 } from './database/migrations/1762670000000-CreateCloudinaryDeletionQueue.js';
import { AddConversationReadState1762680000000 } from './database/migrations/1762680000000-AddConversationReadState.js';
import { AddMessageAttachments1762690000000 } from './database/migrations/1762690000000-AddMessageAttachments.js';
import { AllowRematchesAfterBlocking1762700000000 } from './database/migrations/1762700000000-AllowRematchesAfterBlocking.js';
import { CleanBlockedRelationships1762710000000 } from './database/migrations/1762710000000-CleanBlockedRelationships.js';
import { AddDailyDiscoveryQuota1762720000000 } from './database/migrations/1762720000000-AddDailyDiscoveryQuota.js';
import { UsersModule } from './users/users.module.js';
import { validateEnvironment } from './config/validate-environment.js';
import { APP_GUARD } from '@nestjs/core';
import { PlatformModule } from './platform/platform.module.js';
import { SocialModule } from './social/social.module.js';
import { CoupleModule } from './couple/couple.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        migrations: [
          CreateIdentitySchema1762580000000,
          CreatePlatformTables1762600000000,
          CreateSocialFeatures1762650000000,
          CreateCoupleSchema1762660000000,
          CreateCloudinaryDeletionQueue1762670000000,
          AddConversationReadState1762680000000,
          AddMessageAttachments1762690000000,
          AllowRematchesAfterBlocking1762700000000,
          CleanBlockedRelationships1762710000000,
          AddDailyDiscoveryQuota1762720000000,
        ],
        migrationsTableName: 'typeorm_migrations',
        extra: {
          max: config.get<number>('DATABASE_POOL_MAX', 10),
          connectionTimeoutMillis: 10_000,
          idleTimeoutMillis: 30_000,
        },
        ssl:
          config.get<string>('DATABASE_SSL') === 'true'
            ? { rejectUnauthorized: true }
            : false,
      }),
    }),
    TypeOrmModule.forFeature([User]),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    AuthModule,
    UsersModule,
    PlatformModule,
    SocialModule,
    CoupleModule,
    RealtimeModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
