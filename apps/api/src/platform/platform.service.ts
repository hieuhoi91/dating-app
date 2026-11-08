import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CloudinaryDeletionService } from '../storage/cloudinary-deletion.service.js';
import { CloudinaryService } from '../storage/cloudinary.service.js';
import type { ProfilePhotoUploadDto } from './dto/profile-photo.dto.js';

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
};

type PhotoRow = {
  id: string;
  user_id: string;
  cloudinary_public_id: string;
  secure_url: string;
  sort_order: number;
  is_primary: boolean;
  role: 'avatar' | 'cover' | null;
  created_at: Date;
};

const imageSignatures: Record<string, (bytes: Buffer) => boolean> = {
  'image/jpeg': (bytes) =>
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff,
  'image/png': (bytes) =>
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (bytes) =>
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP',
};

@Injectable()
export class PlatformService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cloudinary: CloudinaryService,
    private readonly cloudinaryDeletion: CloudinaryDeletionService,
  ) {}

  async getNotifications(userId: string) {
    const notifications = await this.dataSource.query(
      `SELECT n.id, n.event_id, n.type, n.title, n.body, n.read_at,
              n.created_at,
              CASE WHEN p.user_id IS NULL THEN NULL
                   ELSE jsonb_build_object(
                     'id', p.user_id,
                     'username', p.username,
                     'display_name', p.display_name,
                     'gender', p.gender,
                     'bio', p.bio,
                     'coarse_location',
                       CASE WHEN s.privacy_preferences -> 'show_coarse_location' = 'false'::jsonb
                            THEN NULL ELSE p.coarse_location END,
                     'verification_status', p.verification_status,
                     'photo_urls', COALESCE((
                       SELECT array_agg(pp.secure_url ORDER BY pp.sort_order, pp.created_at)
                       FROM profile_photos pp WHERE pp.user_id = p.user_id
                     ), '{}'::text[]),
                     'interests', '{}'::text[]
                   )
              END AS related_profile
       FROM notifications n
       LEFT JOIN relationship_events e ON e.id = n.event_id
       LEFT JOIN profiles p ON p.user_id = CASE
         WHEN e.event_type = 'match_created' THEN
           CASE WHEN n.recipient_id = e.actor_id
                THEN e.new_match_partner_id ELSE e.actor_id END
         WHEN e.event_type IN ('couple_invitation_created', 'couple_invitation_accepted') THEN
           CASE WHEN n.recipient_id = e.actor_id
                THEN e.current_partner_id ELSE e.actor_id END
         ELSE NULL
       END
       LEFT JOIN user_settings s ON s.user_id = p.user_id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId],
    );
    return { notifications };
  }

  async setNotificationRead(userId: string, id: string, read: boolean) {
    const [notification] = await this.dataSource.query(
      `UPDATE notifications
       SET read_at = $3
       WHERE id = $1 AND recipient_id = $2
       RETURNING id, read_at`,
      [id, userId, read ? new Date() : null],
    );
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo.');
    return { notification };
  }

  async markAllNotificationsRead(userId: string) {
    await this.dataSource.query(
      `UPDATE notifications
       SET read_at = now()
       WHERE recipient_id = $1 AND read_at IS NULL`,
      [userId],
    );
    return { updated: true };
  }

  async getSubscriptions(userId: string) {
    const subscriptions = await this.dataSource.query(
      `SELECT id, plan_code, status, starts_at, expires_at, created_at
       FROM user_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return { subscriptions };
  }

  async getVerifications(userId: string) {
    const verifications = await this.dataSource.query(
      `SELECT id, user_id, provider, status, created_at, completed_at
       FROM face_verifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId],
    );
    return { verifications };
  }

  async getRelationshipEvents(userId: string) {
    const events = await this.dataSource.query(
      `SELECT id, event_type, actor_id, match_id, current_couple_id,
              current_partner_id, new_match_partner_id, occurred_at,
              metadata_minimal
       FROM relationship_events
       WHERE actor_id = $1
          OR current_partner_id = $1
          OR new_match_partner_id = $1
       ORDER BY occurred_at DESC
       LIMIT 50`,
      [userId],
    );
    return { events };
  }

  async getProfilePhotos(userId: string) {
    const photos = (await this.dataSource.query(
      `SELECT id, user_id, cloudinary_public_id, secure_url, sort_order,
              is_primary, role, created_at
       FROM profile_photos
       WHERE user_id = $1
       ORDER BY sort_order, created_at`,
      [userId],
    )) as PhotoRow[];
    return { photos: photos.map((photo) => this.toPhotoResponse(photo)) };
  }

  async uploadProfilePhoto(
    userId: string,
    file: UploadedImage,
    input: ProfilePhotoUploadDto,
  ) {
    if (
      !imageSignatures[file.mimetype]?.(file.buffer) ||
      file.buffer.length === 0 ||
      file.buffer.length > 8 * 1024 * 1024
    ) {
      throw new BadRequestException(
        'Ảnh hồ sơ phải là JPEG, PNG hoặc WebP và không quá 8 MB.',
      );
    }

    const uploaded = await this.cloudinary.uploadImage(
      file.buffer,
      `dating/profiles/${userId}`,
    );
    let created: { photo: PhotoRow; replacedPhoto: PhotoRow | null };

    try {
      created = await this.dataSource.transaction(async (manager) => {
        await manager.query(
          'SELECT user_id FROM profiles WHERE user_id = $1 FOR UPDATE',
          [userId],
        );
        const photos = (await manager.query(
          `SELECT id, user_id, cloudinary_public_id, secure_url, sort_order,
                  is_primary, role, created_at
           FROM profile_photos
           WHERE user_id = $1
           ORDER BY sort_order
           FOR UPDATE`,
          [userId],
        )) as PhotoRow[];
        const role = input.role ?? (input.primary ? 'avatar' : null);
        const [profile] = (await manager.query(
          'SELECT cover_photo_id FROM profiles WHERE user_id = $1',
          [userId],
        )) as { cover_photo_id: string | null }[];
        const galleryPhotos = photos.filter(
          (item) =>
            item.role === null &&
            !item.is_primary &&
            item.id !== profile?.cover_photo_id,
        );
        if (!role && galleryPhotos.length >= 6) {
          throw new ConflictException('Thư viện hồ sơ đã đủ 6 ảnh.');
        }

        const replacedPhoto = role
          ? photos.find((item) =>
              role === 'avatar'
                ? item.role === 'avatar' || item.is_primary
                : item.role === 'cover' ||
                  item.id === profile?.cover_photo_id,
            ) ?? null
          : null;
        const sortOrder = Math.min(
          input.sortOrder ?? (role ? 0 : galleryPhotos.length),
          5,
        );

        if (replacedPhoto) {
          await this.cloudinaryDeletion.enqueue(manager, [
            replacedPhoto.cloudinary_public_id,
          ]);
          if (role === 'cover') {
            await manager.query(
              'UPDATE profiles SET cover_photo_id = NULL WHERE user_id = $1 AND cover_photo_id = $2',
              [userId, replacedPhoto.id],
            );
          }
          await manager.query('DELETE FROM profile_photos WHERE id = $1', [
            replacedPhoto.id,
          ]);
        }

        const [created] = (await manager.query(
          `INSERT INTO profile_photos
             (user_id, cloudinary_public_id, secure_url, sort_order, is_primary, role)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, user_id, cloudinary_public_id, secure_url, sort_order,
                     is_primary, role, created_at`,
          [
            userId,
            uploaded.publicId,
            uploaded.secureUrl,
            sortOrder,
            role === 'avatar',
            role,
          ],
        )) as PhotoRow[];
        if (role === 'cover') {
          await manager.query(
            'UPDATE profiles SET cover_photo_id = $2 WHERE user_id = $1',
            [userId, created.id],
          );
        }
        return { photo: created, replacedPhoto };
      });
    } catch (error) {
      await this.queueOrphanedUpload(uploaded.publicId);
      throw error;
    }

    return {
      photo: this.toPhotoResponse(created.photo),
      ...(created.replacedPhoto
        ? { replacedPhotoId: created.replacedPhoto.id }
        : {}),
    };
  }

  async deleteProfilePhoto(userId: string, photoId: string) {
    await this.dataSource.transaction(async (manager) => {
      const [profile] = (await manager.query(
        'SELECT cover_photo_id FROM profiles WHERE user_id = $1 FOR UPDATE',
        [userId],
      )) as { cover_photo_id: string | null }[];
      if (!profile) throw new NotFoundException('Không tìm thấy ảnh hồ sơ.');

      const [photo] = (await manager.query(
        `SELECT id, cloudinary_public_id, role, is_primary
         FROM profile_photos
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [photoId, userId],
      )) as {
        id: string;
        cloudinary_public_id: string;
        role: string | null;
        is_primary: boolean;
      }[];
      if (!photo) throw new NotFoundException('Không tìm thấy ảnh hồ sơ.');
      if (
        photo.role !== null ||
        photo.is_primary ||
        profile.cover_photo_id === photoId
      ) {
        throw new ConflictException(
          'Chỉ có thể xóa ảnh trong thư viện, không thể xóa ảnh đại diện hoặc ảnh nền tại đây.',
        );
      }

      await this.cloudinaryDeletion.enqueue(manager, [
        photo.cloudinary_public_id,
      ]);
      await manager.query('DELETE FROM profile_photos WHERE id = $1', [photoId]);
      if (photo.role === 'cover') {
        await manager.query(
          'UPDATE profiles SET cover_photo_id = NULL WHERE user_id = $1 AND cover_photo_id = $2',
          [userId, photoId],
        );
      }
    });
    return { deleted: true };
  }

  private async queueOrphanedUpload(publicId: string): Promise<void> {
    try {
      await this.cloudinaryDeletion.enqueueOutsideTransaction(publicId);
    } catch (error) {
      console.error(
        `Could not queue orphaned profile image ${publicId}.`,
        error,
      );
    }
  }

  private toPhotoResponse(photo: PhotoRow) {
    return {
      id: photo.id,
      user_id: photo.user_id,
      storage_path: photo.cloudinary_public_id,
      sort_order: photo.sort_order,
      is_primary: photo.is_primary,
      role: photo.role,
      created_at: photo.created_at,
      signedUrl: photo.secure_url,
    };
  }
}
