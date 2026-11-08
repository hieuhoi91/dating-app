import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '../database/entities/user.entity.js';
import { SocialService } from '../social/social.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller('api/me')
export class ApiMeController {
  constructor(
    private readonly users: UsersService,
    private readonly social: SocialService,
  ) {}

  @Get()
  async getAccount(@CurrentUser() user: User) {
    const [profile, preferences, settings] = await Promise.all([
      this.users.getProfile(user.id),
      this.social.getPreferences(user.id),
      this.social.getSettings(user.id),
    ]);
    return {
      profile: this.toLegacyProfile(profile),
      profileDateOfBirthAvailable: true,
      profileCoverAvailable: true,
      preferences: preferences.preferences,
      settings: settings.settings,
    };
  }

  @Patch()
  async updateAccount(
    @CurrentUser() user: User,
    @Body() input: UpdateProfileDto,
  ) {
    const profile = await this.users.updateProfile(user.id, input);
    return { profile: this.toLegacyProfile(profile) };
  }

  private toLegacyProfile({
    profile,
    personalData,
  }: Awaited<ReturnType<UsersService['getProfile']>>) {
    return {
      id: profile.userId,
      username: profile.username,
      display_name: profile.displayName,
      gender: profile.gender,
      bio: profile.bio,
      coarse_location: profile.coarseLocation,
      verification_status: profile.verificationStatus,
      profile_visibility: profile.profileVisibility,
      cover_photo_id: profile.coverPhotoId,
      is_complete: profile.isComplete,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
      date_of_birth: personalData.dateOfBirth,
      latitude: personalData.latitude,
      longitude: personalData.longitude,
    };
  }
}
