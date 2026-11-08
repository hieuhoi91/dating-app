import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ProfilePhotoUploadDto } from './dto/profile-photo.dto.js';
import { PlatformService } from './platform.service.js';

describe('PlatformService profile photos', () => {
  const query = vi.fn();
  const managerQuery = vi.fn();
  const dataSource = {
    query,
    transaction: vi.fn(),
  };
  const cloudinary = { uploadImage: vi.fn() };
  const cloudinaryDeletion = {
    enqueue: vi.fn(),
    enqueueOutsideTransaction: vi.fn(),
  };
  let platform: PlatformService;

  beforeEach(() => {
    query.mockReset();
    managerQuery.mockReset();
    dataSource.transaction.mockReset();
    cloudinary.uploadImage.mockReset();
    cloudinaryDeletion.enqueue.mockReset();
    cloudinaryDeletion.enqueueOutsideTransaction.mockReset();
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    platform = new PlatformService(
      dataSource as unknown as DataSource,
      cloudinary as never,
      cloudinaryDeletion as never,
    );
  });

  it('includes the other person profile on Like, Match and Couple notifications', async () => {
    const notifications = [
      {
        id: 'notification-id',
        related_profile: {
          id: 'partner-id',
          display_name: 'Người kết nối',
          photo_urls: ['https://example.test/avatar.jpg'],
        },
      },
    ];
    query.mockResolvedValueOnce(notifications);

    await expect(platform.getNotifications('current-user')).resolves.toEqual({
      notifications,
    });

    expect(query.mock.calls[0]?.[0]).toContain('LEFT JOIN relationship_events');
    expect(query.mock.calls[0]?.[0]).toContain('related_profile');
    expect(query.mock.calls[0]?.[0]).toContain("'like_received'");
    expect(query.mock.calls[0]?.[1]).toEqual(['current-user']);
  });

  it.each([
    {
      role: 'avatar',
      is_primary: true,
      cover_photo_id: null,
    },
    {
      role: 'cover',
      is_primary: false,
      cover_photo_id: 'photo-id',
    },
  ])('does not allow deleting a profile-role photo', async (photo) => {
    managerQuery
      .mockResolvedValueOnce([{ cover_photo_id: photo.cover_photo_id }])
      .mockResolvedValueOnce([
        {
          id: 'photo-id',
          cloudinary_public_id: 'photo-public-id',
          role: photo.role,
          is_primary: photo.is_primary,
        },
      ]);

    await expect(
      platform.deleteProfilePhoto('user-id', 'photo-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(cloudinaryDeletion.enqueue).not.toHaveBeenCalled();
    expect(managerQuery).toHaveBeenCalledTimes(2);
  });

  it('deletes a gallery photo without changing avatar or cover records', async () => {
    managerQuery
      .mockResolvedValueOnce([{ cover_photo_id: 'cover-photo-id' }])
      .mockResolvedValueOnce([
        {
          id: 'gallery-photo-id',
          cloudinary_public_id: 'gallery-public-id',
          role: null,
          is_primary: false,
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(
      platform.deleteProfilePhoto('user-id', 'gallery-photo-id'),
    ).resolves.toEqual({ deleted: true });

    expect(cloudinaryDeletion.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      ['gallery-public-id'],
    );
    expect(managerQuery.mock.calls[2][0]).toBe(
      'DELETE FROM profile_photos WHERE id = $1',
    );
  });

  it('keeps gallery photos when uploading a separate avatar', async () => {
    const galleryPhotos = Array.from({ length: 6 }, (_, index) => ({
      id: `gallery-${index}`,
      user_id: 'user-id',
      cloudinary_public_id: `gallery-public-${index}`,
      secure_url: `https://example.test/gallery-${index}`,
      sort_order: index,
      is_primary: false,
      role: null,
      created_at: new Date(),
    }));
    cloudinary.uploadImage.mockResolvedValue({
      publicId: 'avatar-public-id',
      secureUrl: 'https://example.test/avatar',
    });
    managerQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(galleryPhotos)
      .mockResolvedValueOnce([{ cover_photo_id: null }])
      .mockResolvedValueOnce([
        {
          id: 'avatar-photo-id',
          user_id: 'user-id',
          cloudinary_public_id: 'avatar-public-id',
          secure_url: 'https://example.test/avatar',
          sort_order: 0,
          is_primary: true,
          role: 'avatar',
          created_at: new Date(),
        },
      ]);

    await expect(
      platform.uploadProfilePhoto(
        'user-id',
        {
          mimetype: 'image/jpeg',
          buffer: Buffer.from([0xff, 0xd8, 0xff]),
        },
        { role: 'avatar' } as ProfilePhotoUploadDto,
      ),
    ).resolves.toMatchObject({
      photo: { role: 'avatar', is_primary: true },
    });

    expect(cloudinaryDeletion.enqueue).not.toHaveBeenCalled();
    expect(managerQuery).toHaveBeenCalledTimes(4);
  });
});
