import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Profile } from '../database/entities/profile.entity.js';
import { UserPersonalData } from '../database/entities/user-personal-data.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

type UserProfile = {
  profile: Profile;
  personalData: UserPersonalData;
};

export function usernameFromDisplayName(displayName: string): string {
  const username = displayName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30);
  return username.length >= 3 ? username : 'user';
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
    @InjectRepository(UserPersonalData)
    private readonly personalData: Repository<UserPersonalData>,
  ) {}

  async getProfile(
    userId: string,
  ): Promise<UserProfile> {
    const [profile, personalData] = await Promise.all([
      this.profiles.findOneBy({ userId }),
      this.personalData.findOneBy({ userId }),
    ]);
    if (!profile || !personalData) {
      throw new NotFoundException('Không tìm thấy hồ sơ.');
    }
    return { profile, personalData };
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileDto,
  ): Promise<UserProfile> {
    const { profile, personalData } = await this.getProfile(userId);
    const { dateOfBirth, latitude, longitude, ...profileInput } = input;
    Object.assign(profile, profileInput);
    if (dateOfBirth !== undefined) personalData.dateOfBirth = dateOfBirth;
    if (latitude !== undefined) personalData.latitude = latitude;
    if (longitude !== undefined) personalData.longitude = longitude;
    profile.isComplete = Boolean(
      profile.displayName.trim() &&
        profile.gender &&
        personalData.dateOfBirth &&
        this.isAtLeastEighteen(personalData.dateOfBirth),
    );

    try {
      return await this.profiles.manager.transaction(async (manager) => {
        const profiles = manager.getRepository(Profile);
        const personalDataRepository = manager.getRepository(UserPersonalData);
        const requestedUsername = input.username?.trim().toLowerCase();
        if (requestedUsername) {
          profile.username = requestedUsername;
        } else if (!profile.username) {
          profile.username = await this.createAvailableUsername(
            manager,
            userId,
            usernameFromDisplayName(profile.displayName),
          );
        }
        const [savedProfile, savedPersonalData] = await Promise.all([
          profiles.save(profile),
          personalDataRepository.save(personalData),
        ]);
        return { profile: savedProfile, personalData: savedPersonalData };
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Tên tài khoản này đã được sử dụng.');
      }
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23514'
      ) {
        throw new BadRequestException(
          'Ngày sinh phải phù hợp với yêu cầu đủ 18 tuổi.',
        );
      }
      throw error;
    }
  }

  private async createAvailableUsername(
    manager: EntityManager,
    userId: string,
    base: string,
  ): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [base]);
    for (let suffix = 1; suffix <= 10_000; suffix += 1) {
      const username =
        suffix === 1
          ? base
          : `${base.slice(0, 30 - String(suffix).length)}${suffix}`;
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`username:${username}`],
      );
      const [existing] = await manager.query(
        'SELECT user_id FROM profiles WHERE username = $1 AND user_id <> $2',
        [username, userId],
      );
      if (!existing) return username;
    }
    throw new ConflictException(
      'Không thể tạo tên tài khoản tự động. Hãy thử tên hiển thị khác.',
    );
  }

  toPublicProfile({ profile, personalData }: UserProfile) {
    return {
      id: profile.userId,
      username: profile.username,
      displayName: profile.displayName,
      gender: profile.gender,
      bio: profile.bio,
      coarseLocation: profile.coarseLocation,
      verificationStatus: profile.verificationStatus,
      profileVisibility: profile.profileVisibility,
      coverPhotoId: profile.coverPhotoId,
      dateOfBirth: personalData.dateOfBirth,
      latitude: personalData.latitude,
      longitude: personalData.longitude,
      isComplete: profile.isComplete,
    };
  }

  private isAtLeastEighteen(dateOfBirth: string): boolean {
    const today = new Date();
    const birthday = new Date(`${dateOfBirth}T00:00:00.000Z`);
    if (!Number.isFinite(birthday.getTime())) return false;
    let age = today.getUTCFullYear() - birthday.getUTCFullYear();
    const birthdayHasNotOccurred =
      today.getUTCMonth() < birthday.getUTCMonth() ||
      (today.getUTCMonth() === birthday.getUTCMonth() &&
        today.getUTCDate() < birthday.getUTCDate());
    if (birthdayHasNotOccurred) age -= 1;
    return age >= 18;
  }
}
