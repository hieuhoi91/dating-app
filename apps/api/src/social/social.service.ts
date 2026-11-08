import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { CloudinaryDeletionService } from '../storage/cloudinary-deletion.service.js';
import { CloudinaryService } from '../storage/cloudinary.service.js';
import type {
  BlockDto,
  DiscoveryQueryDto,
  LikeDto,
  PreferencesPatchDto,
  ReportDto,
  SettingsPatchDto,
} from './dto/social.dto.js';

type PreferenceRow = {
  user_id: string;
  interested_in: string[];
  age_min: number;
  age_max: number;
  max_distance_km: number;
  interests: string[];
  discovery_enabled: boolean;
  updated_at: Date;
};

type SettingsRow = {
  profile_visibility: 'discoverable' | 'hidden';
  push_enabled: boolean;
  email_enabled: boolean;
  privacy_preferences: Record<string, boolean>;
  notification_preferences: Record<string, boolean>;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string;
  gender: string | null;
  bio: string;
  coarse_location: string | null;
  verification_status: string;
  photo_urls: string[];
};

const preferenceFields = [
  'interested_in',
  'age_min',
  'age_max',
  'max_distance_km',
  'interests',
  'discovery_enabled',
] as const;
const settingFields = [
  'profile_visibility',
  'push_enabled',
  'email_enabled',
  'privacy_preferences',
  'notification_preferences',
] as const;

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimeGateway,
    private readonly cloudinary: CloudinaryService,
    private readonly cloudinaryDeletion: CloudinaryDeletionService,
  ) {}

  async getPreferences(userId: string) {
    await this.ensureUserRow(userId, 'user_preferences');
    const [preferences] = await this.dataSource.query<PreferenceRow[]>(
      `SELECT interested_in, age_min, age_max, max_distance_km, interests,
              discovery_enabled, updated_at
       FROM user_preferences WHERE user_id = $1`,
      [userId],
    );
    return { preferences };
  }

  async patchPreferences(userId: string, input: PreferencesPatchDto) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one preference is required.');
    }
    await this.ensureUserRow(userId, 'user_preferences');
    const [current] = await this.dataSource.query<PreferenceRow[]>(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId],
    );
    const ageMin = input.age_min ?? current.age_min;
    const ageMax = input.age_max ?? current.age_max;
    if (ageMin > ageMax) {
      throw new BadRequestException(
        'The minimum age cannot be greater than the maximum age.',
      );
    }
    const entries = preferenceFields.filter((field) => input[field] !== undefined);
    const values = entries.map((field) => input[field]);
    const assignments = entries.map(
      (field, index) => `"${field}" = $${index + 2}`,
    );
    assignments.push('updated_at = now()');
    const [preferences] = await this.dataSource.query<PreferenceRow[]>(
      `UPDATE user_preferences SET ${assignments.join(', ')}
       WHERE user_id = $1
       RETURNING interested_in, age_min, age_max, max_distance_km, interests,
                 discovery_enabled, updated_at`,
      [userId, ...values],
    );
    return { preferences };
  }

  async getSettings(userId: string) {
    await this.ensureUserRow(userId, 'user_settings');
    const [settings] = await this.dataSource.query<SettingsRow[]>(
      `SELECT profile_visibility, push_enabled, email_enabled,
              privacy_preferences, notification_preferences
       FROM user_settings WHERE user_id = $1`,
      [userId],
    );
    return { settings };
  }

  async patchSettings(userId: string, input: SettingsPatchDto) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one setting is required.');
    }
    await this.ensureUserRow(userId, 'user_settings');
    const [current] = await this.dataSource.query<SettingsRow[]>(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId],
    );
    const updates = Object.assign({}, input) as SettingsPatchDto;
    if (input.privacy_preferences) {
      updates.privacy_preferences = {
        ...current.privacy_preferences,
        ...input.privacy_preferences,
      };
    }
    if (input.notification_preferences) {
      updates.notification_preferences = {
        ...current.notification_preferences,
        ...input.notification_preferences,
      };
    }
    const entries = settingFields.filter((field) => updates[field] !== undefined);
    const values = entries.map((field) => updates[field]);
    const assignments = entries.map(
      (field, index) => `"${field}" = $${index + 2}`,
    );
    assignments.push('updated_at = now()');
    const [settings] = await this.dataSource.transaction(async (manager) => {
      const [saved] = await manager.query<SettingsRow[]>(
        `UPDATE user_settings SET ${assignments.join(', ')}
         WHERE user_id = $1
         RETURNING profile_visibility, push_enabled, email_enabled,
                   privacy_preferences, notification_preferences`,
        [userId, ...values],
      );
      if (updates.profile_visibility !== undefined) {
        await manager.query(
          'UPDATE profiles SET profile_visibility = $2 WHERE user_id = $1',
          [userId, updates.profile_visibility],
        );
      }
      return [saved];
    });
    return { settings };
  }

  async getBlocks(userId: string) {
    const blocks = await this.dataSource.query<
      Array<{
        id: string;
        blocked_id: string;
        created_at: Date;
        profile_id: string | null;
        username: string | null;
        display_name: string | null;
        gender: string | null;
        bio: string | null;
        coarse_location: string | null;
        verification_status: string | null;
        photo_urls: string[];
      }>
    >(
      `SELECT b.id, b.blocked_id, b.created_at, p.user_id AS profile_id,
              p.username, p.display_name, p.gender, p.bio,
              CASE WHEN s.privacy_preferences -> 'show_coarse_location' = 'false'::jsonb
                   THEN NULL ELSE p.coarse_location END AS coarse_location,
              p.verification_status,
              COALESCE((
                SELECT array_agg(
                  pp.secure_url
                  ORDER BY pp.is_primary DESC,
                           COALESCE(pp.role = 'avatar', false) DESC,
                           pp.sort_order, pp.created_at
                )
                FROM profile_photos pp WHERE pp.user_id = p.user_id
              ), '{}'::text[]) AS photo_urls
       FROM blocks b
       LEFT JOIN profiles p ON p.user_id = b.blocked_id
       LEFT JOIN user_settings s ON s.user_id = p.user_id
       WHERE b.blocker_id = $1
       ORDER BY b.created_at DESC`,
      [userId],
    );
    return {
      blocks: blocks.map((block) => ({
        id: block.id,
        blocked_id: block.blocked_id,
        created_at: block.created_at,
        profile: block.profile_id
          ? {
              id: block.profile_id,
              username: block.username,
              display_name: block.display_name,
              gender: block.gender,
              bio: block.bio,
              coarse_location: block.coarse_location,
              verification_status: block.verification_status,
              photo_urls: block.photo_urls,
            }
          : null,
      })),
    };
  }

  async addBlock(userId: string, input: BlockDto) {
    if (userId === input.blockedUserId) {
      throw new BadRequestException('You cannot block yourself.');
    }
    await this.assertProfileExists(input.blockedUserId);
    const block = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT user_id FROM profiles
         WHERE user_id = ANY($1::uuid[])
         ORDER BY user_id FOR UPDATE`,
        [[userId, input.blockedUserId]],
      );
      const [createdBlock] = await manager.query<
        Array<{ id: string; blocked_id: string; created_at: Date }>
      >(
        `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)
         ON CONFLICT (blocker_id, blocked_id) DO UPDATE
           SET blocked_id = EXCLUDED.blocked_id
         RETURNING id, blocked_id, created_at`,
        [userId, input.blockedUserId],
      );
      await manager.query(
        `UPDATE matches
         SET status = 'ended', ended_at = COALESCE(ended_at, now())
         WHERE status = 'active'
           AND user_low_id = LEAST($1::uuid, $2::uuid)
           AND user_high_id = GREATEST($1::uuid, $2::uuid)`,
        [userId, input.blockedUserId],
      );
      await manager.query(
        `UPDATE conversations c SET status = 'archived'
         FROM matches m
         WHERE c.match_id = m.id AND c.status = 'active'
           AND m.user_low_id = LEAST($1::uuid, $2::uuid)
           AND m.user_high_id = GREATEST($1::uuid, $2::uuid)`,
        [userId, input.blockedUserId],
      );
      await manager.query(
        `DELETE FROM likes
         WHERE (from_user_id = $1 AND to_user_id = $2)
            OR (from_user_id = $2 AND to_user_id = $1)`,
        [userId, input.blockedUserId],
      );
      await manager.query(
        `UPDATE couple_invitations
         SET status = 'cancelled', responded_at = now()
         WHERE status = 'pending'
           AND ((sender_id = $1 AND receiver_id = $2)
             OR (sender_id = $2 AND receiver_id = $1))`,
        [userId, input.blockedUserId],
      );
      const activeCouples = await manager.query<Array<{ id: string }>>(
        `SELECT c.id
         FROM couples c
         JOIN couple_members first_member
           ON first_member.couple_id = c.id
          AND first_member.user_id = $1 AND first_member.left_at IS NULL
         JOIN couple_members second_member
           ON second_member.couple_id = c.id
          AND second_member.user_id = $2 AND second_member.left_at IS NULL
         WHERE c.status = 'active'
         FOR UPDATE OF c`,
        [userId, input.blockedUserId],
      );
      if (activeCouples.length) {
        const coupleIds = activeCouples.map(({ id }) => id);
        await manager.query(
          `UPDATE couples SET status = 'ended', ended_at = now()
           WHERE id = ANY($1::uuid[]) AND status = 'active'`,
          [coupleIds],
        );
        await manager.query(
          `UPDATE couple_members SET left_at = now()
           WHERE couple_id = ANY($1::uuid[]) AND left_at IS NULL`,
          [coupleIds],
        );
      }
      return createdBlock;
    });
    this.realtime.emitToUsers(
      [userId, input.blockedUserId],
      'engagement:updated',
      {},
    );
    this.realtime.emitToUsers(
      [userId, input.blockedUserId],
      'couple:updated',
      {},
    );
    return { block };
  }

  async removeBlock(userId: string, input: BlockDto) {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.query<Array<{ id: string }>>(
        'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2 RETURNING id',
        [userId, input.blockedUserId],
      );
      if (result.length === 0) {
        throw new NotFoundException('User is not in your blocked list.');
      }
      await manager.query(
        `INSERT INTO discovery_unblock_history (user_id, target_user_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, target_user_id)
         DO UPDATE SET unblocked_at = now()`,
        [userId, input.blockedUserId],
      );
    });
    return { unblocked: true };
  }

  async createReport(userId: string, input: ReportDto) {
    if (userId === input.reportedUserId) {
      throw new BadRequestException('You cannot report yourself.');
    }
    await this.assertProfileExists(input.reportedUserId);
    const [report] = await this.dataSource.query<
      Array<{ id: string; status: string; created_at: Date }>
    >(
      `INSERT INTO reports (reporter_id, reported_user_id, reason, description)
       VALUES ($1, $2, $3, $4) RETURNING id, status, created_at`,
      [
        userId,
        input.reportedUserId,
        input.reason.trim(),
        input.description,
      ],
    );
    return { report };
  }

  async getDiscovery(userId: string, query: DiscoveryQueryDto) {
    if (
      query.age_min !== undefined &&
      query.age_max !== undefined &&
      query.age_min > query.age_max
    ) {
      throw new BadRequestException(
        'The minimum age cannot be greater than the maximum age.',
      );
    }
    await this.ensureUserRow(userId, 'user_preferences');
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT user_id FROM profiles WHERE user_id = $1 FOR UPDATE',
        [userId],
      );
      await manager.query(
        `DELETE FROM discovery_impressions
         WHERE user_id = $1
           AND impression_date < timezone('Asia/Ho_Chi_Minh', now())::date`,
        [userId],
      );
      const [subscription] = await manager.query<
        Array<{ is_unlimited: boolean; resets_at: Date }>
      >(
        `SELECT EXISTS (
           SELECT 1 FROM user_subscriptions
           WHERE user_id = $1 AND status = 'active'
             AND lower(plan_code) NOT IN ('free', 'basic')
             AND (starts_at IS NULL OR starts_at <= now())
             AND (expires_at IS NULL OR expires_at > now())
         ) AS is_unlimited,
         ((timezone('Asia/Ho_Chi_Minh', now())::date + 1)::timestamp
           AT TIME ZONE 'Asia/Ho_Chi_Minh') AS resets_at`,
        [userId],
      );
      const isUnlimited = subscription?.is_unlimited ?? false;
      const [usage] = isUnlimited
        ? [{ viewed_today: 0 }]
        : await manager.query<Array<{ viewed_today: number }>>(
            `SELECT count(*)::int AS viewed_today
             FROM discovery_impressions
             WHERE user_id = $1
               AND impression_date = timezone('Asia/Ho_Chi_Minh', now())::date`,
            [userId],
          );
      const viewedToday = usage?.viewed_today ?? 0;
      const remaining = isUnlimited ? null : Math.max(0, 20 - viewedToday);
      const resultLimit = isUnlimited
        ? null
        : Math.min(query.limit, remaining ?? 0);
      const profiles =
        resultLimit === 0
          ? []
          : await manager.query<
              Array<
                ProfileRow & {
                  age: number;
                  interests: string[];
                }
              >
            >(
              `SELECT p.user_id AS id, p.username, p.display_name, p.gender, p.bio,
              CASE WHEN target_settings.privacy_preferences -> 'show_coarse_location' = 'false'::jsonb
                   THEN NULL ELSE p.coarse_location END AS coarse_location,
              p.verification_status,
              EXTRACT(YEAR FROM age(CURRENT_DATE, target_data.date_of_birth))::integer AS age,
              COALESCE(target_preferences.interests, '{}'::text[]) AS interests,
              COALESCE((
                SELECT array_agg(
                  pp.secure_url
                  ORDER BY pp.is_primary DESC,
                           COALESCE(pp.role = 'avatar', false) DESC,
                           pp.sort_order, pp.created_at
                )
                FROM profile_photos pp WHERE pp.user_id = p.user_id
              ), '{}'::text[]) AS photo_urls
       FROM profiles p
       JOIN private.user_personal_data target_data ON target_data.user_id = p.user_id
       JOIN user_preferences current_preferences ON current_preferences.user_id = $1
       JOIN private.user_personal_data current_data ON current_data.user_id = $1
       LEFT JOIN user_preferences target_preferences ON target_preferences.user_id = p.user_id
       LEFT JOIN user_settings target_settings ON target_settings.user_id = p.user_id
       WHERE p.user_id <> $1 AND p.is_complete = true
         AND p.profile_visibility = 'discoverable'
         AND COALESCE(target_preferences.discovery_enabled, true) = true
         AND target_data.date_of_birth IS NOT NULL
         AND EXTRACT(YEAR FROM age(CURRENT_DATE, target_data.date_of_birth))
             BETWEEN COALESCE($3::integer, current_preferences.age_min)
                 AND COALESCE($4::integer, current_preferences.age_max)
         AND (
           ($5::varchar IS NULL AND (
             cardinality(current_preferences.interested_in) = 0
             OR p.gender = ANY(current_preferences.interested_in)
           ))
           OR ($5::varchar IS NOT NULL AND p.gender = $5)
         )
         AND NOT EXISTS (
           SELECT 1 FROM matches m WHERE m.status = 'active'
             AND ((m.user_low_id = $1 AND m.user_high_id = p.user_id)
               OR (m.user_high_id = $1 AND m.user_low_id = p.user_id))
         )
         AND NOT EXISTS (
           SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = p.user_id)
             OR (b.blocker_id = p.user_id AND b.blocked_id = $1)
         )
         AND NOT EXISTS (
           SELECT 1 FROM likes l WHERE l.from_user_id = $1 AND l.to_user_id = p.user_id
         )
         AND (
           $7::boolean
           OR NOT EXISTS (
             SELECT 1 FROM discovery_impressions seen
             WHERE seen.user_id = $1 AND seen.target_user_id = p.user_id
               AND seen.impression_date =
                   timezone('Asia/Ho_Chi_Minh', now())::date
           )
         )
         AND (
           COALESCE($6::integer, current_preferences.max_distance_km) >= 500
           OR current_data.latitude IS NULL OR current_data.longitude IS NULL
           OR target_data.latitude IS NULL OR target_data.longitude IS NULL
           OR 6371 * acos(LEAST(1.0, GREATEST(-1.0,
             sin(radians(current_data.latitude)) * sin(radians(target_data.latitude))
             + cos(radians(current_data.latitude)) * cos(radians(target_data.latitude))
             * cos(radians(target_data.longitude - current_data.longitude))
           ))) <= COALESCE($6::integer, current_preferences.max_distance_km)
         )
       ORDER BY
         -ln(GREATEST(random(), 0.0000000001)) /
           CASE WHEN EXISTS (
             SELECT 1 FROM discovery_unblock_history recent_unblock
             WHERE recent_unblock.user_id = $1
               AND recent_unblock.target_user_id = p.user_id
           ) THEN 0.5 ELSE 1.0 END
       LIMIT COALESCE($2::integer, 2147483647)`,
              [
                userId,
                resultLimit,
                query.age_min ?? null,
                query.age_max ?? null,
                query.gender ?? null,
                query.max_distance_km ?? null,
                isUnlimited,
              ],
            );
      return {
        profiles,
        discovery: {
          unlimited: isUnlimited,
          daily_limit: isUnlimited ? null : 20,
          viewed_today: isUnlimited ? null : viewedToday,
          remaining: isUnlimited
            ? null
            : Math.max(0, 20 - viewedToday),
          resets_at: isUnlimited ? null : subscription?.resets_at,
        },
      };
    });
  }

  async recordDiscoveryView(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot view your own profile.');
    }
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT user_id FROM profiles WHERE user_id = $1 FOR UPDATE',
        [userId],
      );
      const [targetProfile] = await manager.query<Array<{ user_id: string }>>(
        `SELECT p.user_id
         FROM profiles p
         LEFT JOIN user_preferences preferences ON preferences.user_id = p.user_id
         WHERE p.user_id = $1 AND p.is_complete = true
           AND p.profile_visibility = 'discoverable'
           AND COALESCE(preferences.discovery_enabled, true) = true
           AND NOT EXISTS (
             SELECT 1 FROM matches m WHERE m.status = 'active'
               AND ((m.user_low_id = $2 AND m.user_high_id = p.user_id)
                 OR (m.user_high_id = $2 AND m.user_low_id = p.user_id))
           )
           AND NOT EXISTS (
             SELECT 1 FROM blocks b
             WHERE (b.blocker_id = $2 AND b.blocked_id = p.user_id)
                OR (b.blocker_id = p.user_id AND b.blocked_id = $2)
           )
           AND NOT EXISTS (
             SELECT 1 FROM likes l
             WHERE l.from_user_id = $2 AND l.to_user_id = p.user_id
           )`,
        [targetUserId, userId],
      );
      if (!targetProfile) {
        throw new NotFoundException('Profile is not available.');
      }

      const [subscription] = await manager.query<
        Array<{ is_unlimited: boolean; resets_at: Date }>
      >(
        `SELECT EXISTS (
           SELECT 1 FROM user_subscriptions
           WHERE user_id = $1 AND status = 'active'
             AND lower(plan_code) NOT IN ('free', 'basic')
             AND (starts_at IS NULL OR starts_at <= now())
             AND (expires_at IS NULL OR expires_at > now())
         ) AS is_unlimited,
         ((timezone('Asia/Ho_Chi_Minh', now())::date + 1)::timestamp
           AT TIME ZONE 'Asia/Ho_Chi_Minh') AS resets_at`,
        [userId],
      );
      const isUnlimited = subscription?.is_unlimited ?? false;
      const [usage] = isUnlimited
        ? [{ viewed_today: null }]
        : await manager.query<Array<{ viewed_today: number }>>(
            `SELECT count(*)::int AS viewed_today
             FROM discovery_impressions
             WHERE user_id = $1
               AND impression_date = timezone('Asia/Ho_Chi_Minh', now())::date`,
            [userId],
          );
      const viewedToday = usage?.viewed_today ?? 0;
      const [existingView] = isUnlimited
        ? [{ target_user_id: targetUserId }]
        : await manager.query<Array<{ target_user_id: string }>>(
            `SELECT target_user_id
             FROM discovery_impressions
             WHERE user_id = $1 AND target_user_id = $2
               AND impression_date = timezone('Asia/Ho_Chi_Minh', now())::date`,
            [userId, targetUserId],
          );
      const recorded = Boolean(existingView) || isUnlimited || viewedToday < 20;
      if (recorded && !existingView && !isUnlimited) {
        await manager.query(
          `INSERT INTO discovery_impressions
             (user_id, target_user_id, impression_date)
           VALUES ($1, $2, timezone('Asia/Ho_Chi_Minh', now())::date)
           ON CONFLICT DO NOTHING`,
          [userId, targetUserId],
        );
      }
      const viewedAfterResponse =
        viewedToday + (recorded && !existingView && !isUnlimited ? 1 : 0);
      return {
        recorded,
        discovery: {
          unlimited: isUnlimited,
          daily_limit: isUnlimited ? null : 20,
          viewed_today: isUnlimited ? null : viewedAfterResponse,
          remaining: isUnlimited
            ? null
            : Math.max(0, 20 - viewedAfterResponse),
          resets_at: isUnlimited ? null : subscription?.resets_at,
        },
      };
    });
  }

  async getLikes(userId: string) {
    const [received, sent] = await Promise.all([
      this.dataSource.query<
        Array<{ id: string; from_user_id: string; created_at: Date }>
      >(
        `SELECT l.id, l.from_user_id, l.created_at FROM likes l
         WHERE l.to_user_id = $1 AND l.action = 'like'
           AND NOT EXISTS (
             SELECT 1 FROM matches m WHERE m.status = 'active'
               AND ((m.user_low_id = $1 AND m.user_high_id = l.from_user_id)
                 OR (m.user_high_id = $1 AND m.user_low_id = l.from_user_id))
           )
           AND NOT EXISTS (
             SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = l.from_user_id)
               OR (b.blocker_id = l.from_user_id AND b.blocked_id = $1)
           )
         ORDER BY l.created_at DESC LIMIT 50`,
        [userId],
      ),
      this.dataSource.query<
        Array<{ id: string; to_user_id: string; created_at: Date }>
      >(
        `SELECT l.id, l.to_user_id, l.created_at FROM likes l
         WHERE l.from_user_id = $1 AND l.action = 'like'
           AND NOT EXISTS (
             SELECT 1 FROM matches m WHERE m.status = 'active'
               AND ((m.user_low_id = $1 AND m.user_high_id = l.to_user_id)
                 OR (m.user_high_id = $1 AND m.user_low_id = l.to_user_id))
           )
           AND NOT EXISTS (
             SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = l.to_user_id)
               OR (b.blocker_id = l.to_user_id AND b.blocked_id = $1)
           )
         ORDER BY l.created_at DESC LIMIT 50`,
        [userId],
      ),
    ]);
    const profiles = await this.loadProfiles([
      ...received.map((like) => like.from_user_id),
      ...sent.map((like) => like.to_user_id),
    ]);
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    return {
      received: received.map((like) => ({
        ...like,
        profile: profileById.get(like.from_user_id) ?? null,
      })),
      sent: sent.map((like) => ({
        ...like,
        profile: profileById.get(like.to_user_id) ?? null,
      })),
    };
  }

  async submitLike(userId: string, input: LikeDto) {
    if (userId === input.targetUserId) {
      throw new BadRequestException('You cannot react to your own profile.');
    }
    const outcome = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT user_id
         FROM profiles
         WHERE user_id = ANY($1::uuid[])
         ORDER BY user_id FOR UPDATE`,
        [[userId, input.targetUserId]],
      );
      const [targetProfile] = await manager.query<
        Array<{ user_id: string; is_complete: boolean; profile_visibility: string }>
      >(
        `SELECT user_id, is_complete, profile_visibility
         FROM profiles WHERE user_id = $1`,
        [input.targetUserId],
      );
      if (
        !targetProfile ||
        !targetProfile.is_complete ||
        targetProfile.profile_visibility !== 'discoverable'
      ) {
        throw new NotFoundException('Profile is not available.');
      }
      const [block] = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM blocks
         WHERE (blocker_id = $1 AND blocked_id = $2)
            OR (blocker_id = $2 AND blocked_id = $1)
         LIMIT 1`,
        [userId, input.targetUserId],
      );
      if (block) throw new ForbiddenException('Profile is not available.');
      const [previousLike] = await manager.query<
        Array<{ action: 'like' | 'pass' }>
      >(
        `SELECT action FROM likes WHERE from_user_id = $1 AND to_user_id = $2
         FOR UPDATE`,
        [userId, input.targetUserId],
      );
      await manager.query(
        `INSERT INTO likes (from_user_id, to_user_id, action) VALUES ($1, $2, $3)
         ON CONFLICT (from_user_id, to_user_id) DO UPDATE
           SET action = EXCLUDED.action, created_at = now()`,
        [userId, input.targetUserId, input.action],
      );
      const [result] = await manager.query<
        Array<{
          match_id: string | null;
          conversation_id: string | null;
          reciprocal: boolean;
        }>
      >(
        `SELECT NULL::uuid AS match_id, NULL::uuid AS conversation_id,
                EXISTS (SELECT 1 FROM likes WHERE from_user_id = $2
                  AND to_user_id = $1 AND action = 'like') AS reciprocal`,
        [userId, input.targetUserId],
      );
      if (input.action !== 'like' || !result.reciprocal) {
        const notifications: Array<{
          recipient_id: string;
          id: string;
          event_id: string;
          type: string;
          title: string;
          body: string;
          read_at: null;
          created_at: Date;
        }> = [];
        if (input.action === 'like' && previousLike?.action !== 'like') {
          const [notification] = await manager.query<
            Array<(typeof notifications)[number]>
          >(
            `WITH new_event AS (
               INSERT INTO relationship_events
                 (event_type, actor_id, current_partner_id)
               VALUES ('like_received', $1, $2)
               RETURNING id
             )
             INSERT INTO notifications (recipient_id, event_id, type, title, body)
             SELECT $2, id, 'like', 'Bạn có lượt thích mới!',
                    'Ai đó đã thích hồ sơ của bạn.'
             FROM new_event
             RETURNING id, recipient_id, event_id, type, title, body, read_at, created_at`,
            [userId, input.targetUserId],
          );
          notifications.push(notification);
        }
        return {
          response: {
            result: [{ match_id: null, conversation_id: null, matched: false }],
          },
          notifications,
          matchId: null,
        };
      }

      const [existingMatch] = await manager.query<
        Array<{ id: string; status: string }>
      >(
        `SELECT id, status FROM matches
         WHERE user_low_id = LEAST($1::uuid, $2::uuid)
           AND user_high_id = GREATEST($1::uuid, $2::uuid)
           AND status = 'active'
         FOR UPDATE`,
        [userId, input.targetUserId],
      );
      if (existingMatch) {
        const [existingConversation] = await manager.query<
          Array<{ id: string }>
        >(
          `SELECT id FROM conversations
           WHERE match_id = $1 AND status = 'active'`,
          [existingMatch.id],
        );
        return {
          response: {
            result: [
              {
                match_id: existingMatch.id,
                conversation_id: existingConversation?.id ?? null,
                matched: true,
              },
            ],
          },
          notifications: [],
          matchId: null,
        };
      }
      const [match] = await manager.query<Array<{ id: string }>>(
        `INSERT INTO matches (user_low_id, user_high_id)
         VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid))
         RETURNING id`,
        [userId, input.targetUserId],
      );
      const [conversation] = await manager.query<Array<{ id: string }>>(
        `INSERT INTO conversations (match_id) VALUES ($1)
         RETURNING id`,
        [match.id],
      );
      const notifications: Array<{
        recipient_id: string;
        id: string;
        event_id: string;
        type: string;
        title: string;
        body: string;
        read_at: null;
        created_at: Date;
      }> = [];
      const [event] = await manager.query<Array<{ id: string }>>(
        `INSERT INTO relationship_events
           (event_type, actor_id, match_id, current_partner_id, new_match_partner_id)
         VALUES ('match_created', $1, $2, $3, $3)
         RETURNING id`,
        [userId, match.id, input.targetUserId],
      );
      const recipients = [userId, input.targetUserId];
      const notificationRows = await manager.query<
        Array<(typeof notifications)[number]>
      >(
        `INSERT INTO notifications (recipient_id, event_id, type, title, body)
         SELECT recipient_id, $1, 'match', 'Hai bạn đã tương hợp!',
                'Bạn có thể bắt đầu trò chuyện ngay bây giờ.'
         FROM unnest($2::uuid[]) AS recipient_id
         RETURNING recipient_id, id, event_id, type, title, body, read_at, created_at`,
        [event.id, recipients],
      );
      notifications.push(...notificationRows);
      return {
        response: {
          result: [
            {
              match_id: match.id,
              conversation_id: conversation.id,
              matched: true,
            },
          ],
        },
        notifications,
        matchId: match.id,
      };
    });
    for (const notification of outcome.notifications) {
      this.realtime.emitToUser(
        notification.recipient_id,
        'notification:new',
        notification,
      );
    }
    if (outcome.matchId) {
      this.realtime.emitToUsers(
        [userId, input.targetUserId],
        'engagement:match',
        { id: outcome.matchId, status: 'active' },
      );
    }
    this.realtime.emitToUsers(
      [userId, input.targetUserId],
      'engagement:updated',
      {},
    );
    return outcome.response;
  }

  async getMatches(userId: string) {
    const matches = await this.dataSource.query<
      Array<{
        id: string;
        user_low_id: string;
        user_high_id: string;
        status: string;
        created_at: Date;
        ended_at: Date | null;
        conversation_id: string | null;
        conversation_status: string | null;
        is_couple: boolean;
      }>
    >(
      `SELECT m.id, m.user_low_id, m.user_high_id, m.status, m.created_at,
              m.ended_at, c.id AS conversation_id, c.status AS conversation_status,
              EXISTS (
                SELECT 1 FROM couple_members self_member
                JOIN couple_members partner_member
                  ON partner_member.couple_id = self_member.couple_id
                 AND partner_member.user_id =
                   CASE WHEN m.user_low_id = $1 THEN m.user_high_id ELSE m.user_low_id END
                WHERE self_member.user_id = $1 AND self_member.left_at IS NULL
                  AND partner_member.left_at IS NULL
              ) AS is_couple
       FROM matches m LEFT JOIN conversations c ON c.match_id = m.id
       WHERE (m.user_low_id = $1 OR m.user_high_id = $1) AND m.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id =
             CASE WHEN m.user_low_id = $1 THEN m.user_high_id ELSE m.user_low_id END)
             OR (b.blocked_id = $1 AND b.blocker_id =
             CASE WHEN m.user_low_id = $1 THEN m.user_high_id ELSE m.user_low_id END)
         )
       ORDER BY m.created_at DESC LIMIT 100`,
      [userId],
    );
    const partnerIds = matches.map((match) =>
      match.user_low_id === userId ? match.user_high_id : match.user_low_id,
    );
    const profiles = await this.loadProfiles(partnerIds);
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    return {
      matches: matches.map((match) => {
        const partnerId =
          match.user_low_id === userId ? match.user_high_id : match.user_low_id;
        return {
          id: match.id,
          user_low_id: match.user_low_id,
          user_high_id: match.user_high_id,
          status: match.status,
          created_at: match.created_at,
          ended_at: match.ended_at,
          partner_id: partnerId,
          partner: profileById.get(partnerId) ?? null,
          conversation: match.conversation_id
            ? {
                id: match.conversation_id,
                match_id: match.id,
                status: match.conversation_status,
              }
            : null,
          is_couple: match.is_couple,
        };
      }),
    };
  }

  async endMatch(userId: string, matchId: string) {
    await this.dataSource.transaction(async (manager) => {
      const [match] = await manager.query<
        Array<{ id: string; user_low_id: string; user_high_id: string }>
      >('SELECT id, user_low_id, user_high_id FROM matches WHERE id = $1 FOR UPDATE', [
        matchId,
      ]);
      if (!match) throw new NotFoundException('Match not found.');
      if (match.user_low_id !== userId && match.user_high_id !== userId) {
        throw new ForbiddenException('Match is not available.');
      }
      await manager.query(
        `UPDATE matches SET status = 'ended', ended_at = COALESCE(ended_at, now())
         WHERE id = $1 AND status = 'active'`,
        [matchId],
      );
      await manager.query(
        `UPDATE conversations SET status = 'archived'
         WHERE match_id = $1 AND status = 'active'`,
        [matchId],
      );
    });
    return { ended: true };
  }

  async getConversations(userId: string) {
    const rows = await this.dataSource.query<
      Array<{
        id: string;
        match_id: string;
        status: string;
        created_at: Date;
        partner_id: string;
        latest_id: string | null;
        latest_sender_id: string | null;
        latest_content: string | null;
        latest_created_at: Date | null;
        unread_count: number;
        is_couple: boolean;
      }>
    >(
      `SELECT c.id, c.match_id, c.status, c.created_at,
              CASE WHEN m.user_low_id = $1 THEN m.user_high_id ELSE m.user_low_id END AS partner_id,
              latest.id AS latest_id, latest.sender_id AS latest_sender_id,
              latest.content AS latest_content, latest.created_at AS latest_created_at,
              (
                SELECT count(*)::int
                FROM messages unread
                WHERE unread.conversation_id = c.id
                  AND unread.sender_id <> $1
                  AND unread.deleted_at IS NULL
                  AND unread.created_at > COALESCE(
                    (SELECT last_read_at FROM conversation_reads
                     WHERE user_id = $1 AND conversation_id = c.id),
                    '-infinity'::timestamptz
                  )
              ) AS unread_count,
              EXISTS (
                SELECT 1 FROM couple_members self_member
                JOIN couple_members partner_member
                  ON partner_member.couple_id = self_member.couple_id
                 AND partner_member.user_id =
                   CASE WHEN m.user_low_id = $1 THEN m.user_high_id ELSE m.user_low_id END
                WHERE self_member.user_id = $1 AND self_member.left_at IS NULL
                  AND partner_member.left_at IS NULL
              ) AS is_couple
       FROM conversations c
       JOIN matches m ON m.id = c.match_id
       LEFT JOIN LATERAL (
         SELECT id, sender_id, content, created_at FROM messages
         WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
       ) latest ON true
       WHERE c.status = 'active' AND m.status = 'active'
         AND (m.user_low_id = $1 OR m.user_high_id = $1)
         AND NOT EXISTS (
           SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id =
             CASE WHEN m.user_low_id = $1 THEN m.user_high_id ELSE m.user_low_id END)
             OR (b.blocked_id = $1 AND b.blocker_id =
             CASE WHEN m.user_low_id = $1 THEN m.user_high_id ELSE m.user_low_id END)
         )`,
      [userId],
    );
    const profiles = await this.loadProfiles(rows.map((row) => row.partner_id));
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const conversations = rows.map((row) => ({
      id: row.id,
      match_id: row.match_id,
      status: row.status,
      created_at: row.created_at,
      partner_id: row.partner_id,
      partner: profileById.get(row.partner_id) ?? null,
      latest_message: row.latest_id
        ? {
            id: row.latest_id,
            conversation_id: row.id,
            sender_id: row.latest_sender_id,
            content: row.latest_content,
            created_at: row.latest_created_at,
          }
        : null,
      unread_count: row.unread_count,
      is_couple: row.is_couple,
    }));
    conversations.sort((left, right) => {
      const leftTime = new Date(
        left.latest_message?.created_at ?? left.created_at,
      ).getTime();
      const rightTime = new Date(
        right.latest_message?.created_at ?? right.created_at,
      ).getTime();
      return rightTime - leftTime;
    });
    return { conversations };
  }

  async getMessages(userId: string, conversationId: string, before?: string) {
    await this.assertConversationMember(userId, conversationId);
    await this.dataSource.query(
      `INSERT INTO conversation_reads (user_id, conversation_id, last_read_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id, conversation_id)
       DO UPDATE SET last_read_at = GREATEST(
         conversation_reads.last_read_at,
         EXCLUDED.last_read_at
       )`,
      [userId, conversationId],
    );
    const parameters: unknown[] = [conversationId];
    let beforeClause = '';
    if (before) {
      parameters.push(before);
      beforeClause = `AND created_at < $${parameters.length}`;
    }
    const rows = await this.dataSource.query<
      Array<{
        id: string;
        conversation_id: string;
        sender_id: string;
        content: string;
        created_at: Date;
        deleted_at: Date | null;
        attachment_path: string | null;
        cloudinary_public_id: string | null;
        attachment_url: string | null;
        attachments: { url: string }[];
      }>
    >(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
              m.deleted_at, m.attachment_path, m.cloudinary_public_id,
              m.attachment_url,
              COALESCE(
                (SELECT json_agg(json_build_object('url', ma.attachment_url)
                                 ORDER BY ma.sort_order)
                 FROM message_attachments ma WHERE ma.message_id = m.id),
                CASE WHEN m.attachment_url IS NOT NULL
                     THEN json_build_array(json_build_object('url', m.attachment_url))
                     ELSE '[]'::json END
              ) AS attachments
       FROM messages m WHERE m.conversation_id = $1 ${beforeClause}
       ORDER BY created_at DESC LIMIT 50`,
      parameters,
    );
    return {
      messages: rows.map(
        ({
          cloudinary_public_id: _cloudinaryPublicId,
          attachment_path: _attachmentPath,
          ...message
        }) => message,
      ),
    };
  }

  async createMessage(
    userId: string,
    conversationId: string,
    input: {
      content: string;
      file?: { buffer: Buffer; mimetype: string };
      files?: { buffer: Buffer; mimetype: string }[];
    },
  ) {
    await this.assertConversationMember(userId, conversationId);
    const content = input.content.trim();
    const files = input.files ?? (input.file ? [input.file] : []);
    if (!content && !files.length) {
      throw new BadRequestException('Tin nhắn cần có nội dung hoặc ảnh.');
    }
    if (files.length > 5) {
      throw new BadRequestException('Mỗi tin nhắn có thể gửi tối đa 5 ảnh.');
    }
    if (files.some((file) => !this.isValidChatImage(file))) {
      throw new BadRequestException(
        'Mỗi ảnh phải là JPEG, PNG, WebP hoặc GIF và không quá 8 MB.',
      );
    }

    const uploaded: { publicId: string; secureUrl: string }[] = [];
    try {
      for (const file of files) {
        uploaded.push(
          await this.cloudinary.uploadImage(
            file.buffer,
            `dating/conversations/${conversationId}`,
          ),
        );
      }
    } catch (error) {
      await this.queueOrphanedChatImages(uploaded);
      throw error;
    }

    let saved: {
      conversation: { user_low_id: string; user_high_id: string };
      message: {
        id: string;
        conversation_id: string;
        sender_id: string;
        content: string;
        created_at: Date;
        cloudinary_public_id: string | null;
        attachment_url: string | null;
        attachments: { url: string }[];
      };
    };
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const [conversation] = await manager.query<
          Array<{ user_low_id: string; user_high_id: string }>
        >(
          `SELECT m.user_low_id, m.user_high_id
           FROM conversations c JOIN matches m ON m.id = c.match_id
           WHERE c.id = $1 AND c.status = 'active' AND m.status = 'active'
             AND (m.user_low_id = $2 OR m.user_high_id = $2)
             AND NOT EXISTS (
               SELECT 1 FROM blocks b WHERE
                 (b.blocker_id = $2 AND b.blocked_id =
                   CASE WHEN m.user_low_id = $2 THEN m.user_high_id ELSE m.user_low_id END)
                 OR (b.blocked_id = $2 AND b.blocker_id =
                   CASE WHEN m.user_low_id = $2 THEN m.user_high_id ELSE m.user_low_id END)
             )
           FOR UPDATE OF m`,
          [conversationId, userId],
        );
        if (!conversation) {
          throw new NotFoundException('Active conversation not found.');
        }
        const [message] = await manager.query<
          Array<{
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string;
            created_at: Date;
            cloudinary_public_id: string | null;
            attachment_url: string | null;
          }>
        >(
          `INSERT INTO messages
             (conversation_id, sender_id, content, attachment_path,
              cloudinary_public_id, attachment_url)
           VALUES ($1, $2, $3, $4, $4, $5)
           RETURNING id, conversation_id, sender_id, content, created_at,
                     cloudinary_public_id, attachment_url`,
          [
            conversationId,
            userId,
            content || 'Đã gửi một ảnh',
            uploaded[0]?.publicId ?? null,
            uploaded[0]?.secureUrl ?? null,
          ],
        );
        for (const [sortOrder, attachment] of uploaded.entries()) {
          await manager.query(
            `INSERT INTO message_attachments
               (message_id, cloudinary_public_id, attachment_url, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [message.id, attachment.publicId, attachment.secureUrl, sortOrder],
          );
        }
        return {
          conversation,
          message: {
            ...message,
            attachments: uploaded.map(({ secureUrl }) => ({ url: secureUrl })),
          },
        };
      });
    } catch (error) {
      await this.queueOrphanedChatImages(uploaded);
      throw error;
    }
    const response = {
      message: {
        ...saved.message,
        attachment_path: saved.message.cloudinary_public_id,
      },
    };
    this.realtime.emitToUsers(
      [saved.conversation.user_low_id, saved.conversation.user_high_id],
      'chat:message',
      response.message,
    );
    return response;
  }

  private async queueOrphanedChatImages(
    uploaded: { publicId: string }[],
  ): Promise<void> {
    for (const image of uploaded) {
      try {
        await this.cloudinaryDeletion.enqueueOutsideTransaction(image.publicId);
      } catch (queueError) {
        this.logger.error(
          `Could not queue orphaned chat image ${image.publicId}.`,
          queueError instanceof Error ? queueError.stack : undefined,
        );
      }
    }
  }

  private isValidChatImage(file: { buffer: Buffer; mimetype: string }): boolean {
    if (!file.buffer.length || file.buffer.length > 8 * 1024 * 1024) return false;
    switch (file.mimetype) {
      case 'image/jpeg':
        return (
          file.buffer.length >= 3 &&
          file.buffer[0] === 0xff &&
          file.buffer[1] === 0xd8 &&
          file.buffer[2] === 0xff
        );
      case 'image/png':
        return (
          file.buffer.length >= 8 &&
          file.buffer
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        );
      case 'image/webp':
        return (
          file.buffer.toString('ascii', 0, 4) === 'RIFF' &&
          file.buffer.toString('ascii', 8, 12) === 'WEBP'
        );
      case 'image/gif':
        return ['GIF87a', 'GIF89a'].includes(
          file.buffer.toString('ascii', 0, 6),
        );
      default:
        return false;
    }
  }

  private async ensureUserRow(
    userId: string,
    table: 'user_preferences' | 'user_settings',
  ): Promise<void> {
    const [profile] = await this.dataSource.query<Array<{ user_id: string }>>(
      'SELECT user_id FROM profiles WHERE user_id = $1',
      [userId],
    );
    if (!profile) throw new NotFoundException('Profile not found.');
    await this.dataSource.query(
      `INSERT INTO ${table} (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
  }

  private async assertProfileExists(userId: string): Promise<void> {
    const [profile] = await this.dataSource.query<Array<{ user_id: string }>>(
      'SELECT user_id FROM profiles WHERE user_id = $1',
      [userId],
    );
    if (!profile) throw new NotFoundException('User not found.');
  }

  private async loadProfiles(userIds: string[]): Promise<ProfileRow[]> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return [];
    return this.dataSource.query<ProfileRow[]>(
      `SELECT p.user_id AS id, p.username, p.display_name, p.gender, p.bio,
              CASE WHEN s.privacy_preferences -> 'show_coarse_location' = 'false'::jsonb
                   THEN NULL ELSE p.coarse_location END AS coarse_location,
              p.verification_status,
              COALESCE((
                SELECT array_agg(
                  pp.secure_url
                  ORDER BY pp.is_primary DESC,
                           COALESCE(pp.role = 'avatar', false) DESC,
                           pp.sort_order, pp.created_at
                )
                FROM profile_photos pp WHERE pp.user_id = p.user_id
              ), '{}'::text[]) AS photo_urls
       FROM profiles p LEFT JOIN user_settings s ON s.user_id = p.user_id
       WHERE p.user_id = ANY($1::uuid[])`,
      [uniqueIds],
    );
  }

  private async assertConversationMember(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const [conversation] = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT c.id FROM conversations c
       JOIN matches m ON m.id = c.match_id
       WHERE c.id = $1 AND c.status = 'active' AND m.status = 'active'
         AND (m.user_low_id = $2 OR m.user_high_id = $2)
         AND NOT EXISTS (
           SELECT 1 FROM blocks b WHERE
             (b.blocker_id = $2 AND b.blocked_id =
               CASE WHEN m.user_low_id = $2 THEN m.user_high_id ELSE m.user_low_id END)
             OR (b.blocked_id = $2 AND b.blocker_id =
               CASE WHEN m.user_low_id = $2 THEN m.user_high_id ELSE m.user_low_id END)
         )
       LIMIT 1`,
      [conversationId, userId],
    );
    if (!conversation) {
      throw new NotFoundException('Active conversation not found.');
    }
  }
}
