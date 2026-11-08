import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '../database/entities/user.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async getProfile(@CurrentUser() user: User) {
    const profile = await this.users.getProfile(user.id);
    return {
      profile: this.users.toPublicProfile(profile),
      profileDateOfBirthAvailable: true,
      profileCoverAvailable: true,
    };
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: User,
    @Body() body: UpdateProfileDto,
  ) {
    const profile = await this.users.updateProfile(user.id, body);
    return {
      profile: this.users.toPublicProfile(profile),
      profileDateOfBirthAvailable: true,
      profileCoverAvailable: true,
    };
  }
}
