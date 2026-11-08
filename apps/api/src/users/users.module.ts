import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from '../database/entities/profile.entity.js';
import { UserPersonalData } from '../database/entities/user-personal-data.entity.js';
import { SocialModule } from '../social/social.module.js';
import { ApiMeController } from './api-me.controller.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, UserPersonalData]), SocialModule],
  controllers: [UsersController, ApiMeController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
