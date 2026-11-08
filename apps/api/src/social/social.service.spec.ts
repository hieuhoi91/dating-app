import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SocialService } from './social.service.js';

describe('SocialService', () => {
  const query = vi.fn();
  const managerQuery = vi.fn();
  const dataSource = {
    query,
    transaction: vi.fn(),
  };
  const realtime = {
    emitToUser: vi.fn(),
    emitToUsers: vi.fn(),
  };
  const cloudinary = { uploadImage: vi.fn() };
  const cloudinaryDeletion = { enqueueOutsideTransaction: vi.fn() };
  let social: SocialService;

  beforeEach(() => {
    query.mockReset();
    managerQuery.mockReset();
    dataSource.transaction.mockReset();
    cloudinary.uploadImage.mockReset();
    cloudinaryDeletion.enqueueOutsideTransaction.mockReset();
    realtime.emitToUser.mockReset();
    realtime.emitToUsers.mockReset();
    social = new SocialService(
      dataSource as unknown as DataSource,
      realtime as never,
      cloudinary as never,
      cloudinaryDeletion as never,
    );
  });

  it('rejects preference updates that would invert the stored age range', async () => {
    query
      .mockResolvedValueOnce([{ user_id: 'user-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          age_min: 25,
          age_max: 40,
        },
      ]);

    await expect(
      social.patchPreferences('user-id', { age_max: 24 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('filters discovery by the requested age, gender, and distance', async () => {
    query.mockResolvedValueOnce([{ user_id: 'user-id' }]).mockResolvedValueOnce([]);
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([{ user_id: 'user-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { is_unlimited: false, resets_at: new Date('2026-11-09T00:00:00.000Z') },
      ])
      .mockResolvedValueOnce([{ viewed_today: 0 }])
      .mockResolvedValueOnce([]);

    const result = await social.getDiscovery('user-id', {
      limit: 20,
      age_min: 25,
      age_max: 35,
      gender: 'Nữ',
      max_distance_km: 80,
    });

    expect(managerQuery.mock.calls[4]?.[1]).toEqual([
      'user-id',
      20,
      25,
      35,
      'Nữ',
      80,
      false,
    ]);
    expect(managerQuery.mock.calls[4]?.[0]).toContain(
      'BETWEEN COALESCE($3::integer, current_preferences.age_min)',
    );
    expect(managerQuery.mock.calls[4]?.[0]).toContain('p.gender = $5');
    expect(result.discovery).toMatchObject({
      unlimited: false,
      daily_limit: 20,
      viewed_today: 0,
      remaining: 20,
    });
  });

  it('caps free discovery by the remaining daily views', async () => {
    query.mockResolvedValueOnce([{ user_id: 'user-id' }]).mockResolvedValueOnce([]);
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([{ user_id: 'user-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { is_unlimited: false, resets_at: new Date('2026-11-09T00:00:00.000Z') },
      ])
      .mockResolvedValueOnce([{ viewed_today: 19 }])
      .mockResolvedValueOnce([
        { id: 'last-profile', interests: [], photo_urls: [] },
      ]);

    const result = await social.getDiscovery('user-id', { limit: 20 });

    expect(managerQuery.mock.calls[4]?.[1]).toEqual([
      'user-id',
      1,
      null,
      null,
      null,
      null,
      false,
    ]);
    expect(managerQuery.mock.calls[4]?.[0]).toContain(
      'discovery_unblock_history',
    );
    expect(managerQuery.mock.calls[4]?.[0]).toContain('THEN 0.5 ELSE 1.0 END');
    expect(managerQuery).toHaveBeenCalledTimes(5);
    expect(result.profiles).toHaveLength(1);
    expect(result.discovery).toMatchObject({
      viewed_today: 19,
      remaining: 1,
    });
  });

  it('records a view only when the profile is actually opened', async () => {
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([{ user_id: 'viewer' }])
      .mockResolvedValueOnce([{ user_id: 'target' }])
      .mockResolvedValueOnce([
        { is_unlimited: false, resets_at: new Date('2026-11-09T00:00:00.000Z') },
      ])
      .mockResolvedValueOnce([{ viewed_today: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      social.recordDiscoveryView('viewer', 'target'),
    ).resolves.toMatchObject({
      recorded: true,
      discovery: { viewed_today: 1, remaining: 19 },
    });
    expect(managerQuery.mock.calls[5]?.[0]).toContain(
      'INSERT INTO discovery_impressions',
    );
  });

  it('does not record a new view after reaching the daily limit', async () => {
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([{ user_id: 'viewer' }])
      .mockResolvedValueOnce([{ user_id: 'target' }])
      .mockResolvedValueOnce([
        { is_unlimited: false, resets_at: new Date('2026-11-09T00:00:00.000Z') },
      ])
      .mockResolvedValueOnce([{ viewed_today: 20 }])
      .mockResolvedValueOnce([]);

    await expect(
      social.recordDiscoveryView('viewer', 'target'),
    ).resolves.toMatchObject({
      recorded: false,
      discovery: { viewed_today: 20, remaining: 0 },
    });
    expect(managerQuery).toHaveBeenCalledTimes(5);
  });

  it('does not count profiles fetched but not opened', async () => {
    query.mockResolvedValueOnce([{ user_id: 'user-id' }]).mockResolvedValueOnce([]);
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([{ user_id: 'user-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { is_unlimited: false, resets_at: new Date('2026-11-09T00:00:00.000Z') },
      ])
      .mockResolvedValueOnce([{ viewed_today: 0 }])
      .mockResolvedValueOnce([
        { id: 'not-opened', interests: [], photo_urls: [] },
      ]);

    const result = await social.getDiscovery('user-id', { limit: 20 });

    expect(managerQuery).toHaveBeenCalledTimes(5);
    expect(managerQuery.mock.calls.some(([sql]) =>
      String(sql).includes('INSERT INTO discovery_impressions'),
    )).toBe(false);
    expect(result.discovery).toMatchObject({
      viewed_today: 0,
      remaining: 20,
    });
  });

  it('does not impose a daily limit on an active paid subscription', async () => {
    query.mockResolvedValueOnce([{ user_id: 'user-id' }]).mockResolvedValueOnce([]);
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([{ user_id: 'user-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { is_unlimited: true, resets_at: new Date('2026-11-09T00:00:00.000Z') },
      ])
      .mockResolvedValueOnce([
        { id: 'profile-one', interests: [], photo_urls: [] },
        { id: 'profile-two', interests: [], photo_urls: [] },
      ]);

    const result = await social.getDiscovery('user-id', { limit: 20 });

    expect(managerQuery.mock.calls[3]?.[1]).toEqual([
      'user-id',
      null,
      null,
      null,
      null,
      null,
      true,
    ]);
    expect(managerQuery).toHaveBeenCalledTimes(4);
    expect(result.profiles).toHaveLength(2);
    expect(result.discovery).toMatchObject({
      unlimited: true,
      daily_limit: null,
      viewed_today: null,
      remaining: null,
    });
  });

  it('rejects a discovery query with an inverted age range', async () => {
    await expect(
      social.getDiscovery('user-id', {
        limit: 20,
        age_min: 36,
        age_max: 35,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects self-likes without querying the database', async () => {
    await expect(
      social.submitLike('same-user', {
        targetUserId: 'same-user',
        action: 'like',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('prevents a like when either user has blocked the other', async () => {
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          user_id: 'target-user',
          is_complete: true,
          profile_visibility: 'discoverable',
        },
      ])
      .mockResolvedValueOnce([{ id: 'block-id' }]);

    await expect(
      social.submitLike('current-user', {
        targetUserId: 'target-user',
        action: 'like',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(managerQuery).toHaveBeenCalledTimes(3);
  });

  it('ends a match and clears pair likes when blocking so a later rematch starts fresh', async () => {
    query.mockResolvedValueOnce([{ user_id: 'blocked-user' }]);
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'block-id',
          blocked_id: 'blocked-user',
          created_at: new Date('2026-11-08T07:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      social.addBlock('current-user', { blockedUserId: 'blocked-user' }),
    ).resolves.toMatchObject({
      block: { id: 'block-id', blocked_id: 'blocked-user' },
    });

    expect(managerQuery.mock.calls[2]?.[0]).toContain(
      "SET status = 'ended'",
    );
    expect(managerQuery.mock.calls[3]?.[0]).toContain(
      "SET status = 'archived'",
    );
    expect(managerQuery.mock.calls[4]?.[0]).toContain('DELETE FROM likes');
    expect(managerQuery.mock.calls[5]?.[0]).toContain(
      'UPDATE couple_invitations',
    );
    expect(realtime.emitToUsers).toHaveBeenCalledWith(
      ['current-user', 'blocked-user'],
      'engagement:updated',
      {},
    );
  });

  it('records an unblock so the profile can return with lower discovery priority', async () => {
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([{ id: 'block-id' }])
      .mockResolvedValueOnce([]);

    await expect(
      social.removeBlock('current-user', { blockedUserId: 'target-user' }),
    ).resolves.toEqual({ unblocked: true });

    expect(managerQuery.mock.calls[1]?.[0]).toContain(
      'INSERT INTO discovery_unblock_history',
    );
    expect(managerQuery.mock.calls[1]?.[1]).toEqual([
      'current-user',
      'target-user',
    ]);
  });

  it('inserts a new match instead of reviving an ended match', async () => {
    dataSource.transaction.mockImplementation(
      async (callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
    );
    managerQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          user_id: 'target-user',
          is_complete: true,
          profile_visibility: 'discoverable',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { action: 'like' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          match_id: null,
          conversation_id: null,
          reciprocal: true,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'new-match-id' }])
      .mockResolvedValueOnce([{ id: 'new-conversation-id' }])
      .mockResolvedValueOnce([{ id: 'event-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await social.submitLike('current-user', {
      targetUserId: 'target-user',
      action: 'like',
    });

    expect(result.result[0]).toMatchObject({
      match_id: 'new-match-id',
      conversation_id: 'new-conversation-id',
      matched: true,
    });
    const matchInsert = managerQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO matches'),
    );
    expect(matchInsert?.[0]).not.toContain('ON CONFLICT');
  });

  it('uses the designated avatar first for conversation partners', async () => {
    query
      .mockResolvedValueOnce([
        {
          id: 'conversation-id',
          match_id: 'match-id',
          status: 'active',
          created_at: new Date('2026-11-08T07:00:00.000Z'),
          partner_id: 'partner-id',
          latest_id: null,
          unread_count: 0,
          is_couple: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'partner-id',
          username: 'partner',
          display_name: 'Partner',
          gender: 'Nữ',
          bio: '',
          coarse_location: null,
          verification_status: 'unverified',
          photo_urls: ['avatar-url', 'other-photo-url'],
        },
      ]);

    const result = await social.getConversations('current-user');

    expect(result.conversations[0]?.partner?.photo_urls).toEqual([
      'avatar-url',
      'other-photo-url',
    ]);
    expect(query.mock.calls[1]?.[0]).toContain(
      'ORDER BY pp.is_primary DESC,',
    );
    expect(query.mock.calls[1]?.[0]).toContain(
      "COALESCE(pp.role = 'avatar', false) DESC",
    );
  });

  it('does not disclose messages from a conversation the user cannot access', async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      social.getMessages('outsider', 'conversation-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('JOIN matches');
    expect(query.mock.calls[0]?.[0]).toContain('NOT EXISTS');
  });

  it('marks a conversation read when loading its messages', async () => {
    query
      .mockResolvedValueOnce([{ id: 'conversation-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      social.getMessages('user-id', 'conversation-id'),
    ).resolves.toEqual({ messages: [] });

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO conversation_reads'),
      ['user-id', 'conversation-id'],
    );
  });

  it('returns all message attachments when loading conversation history', async () => {
    query
      .mockResolvedValueOnce([{ id: 'conversation-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'message-id',
          conversation_id: 'conversation-id',
          sender_id: 'sender-id',
          content: 'Ảnh',
          created_at: new Date('2026-11-08T07:00:00.000Z'),
          deleted_at: null,
          attachment_path: 'private-path',
          cloudinary_public_id: 'private-id',
          attachment_url:
            'https://res.cloudinary.com/example/image/upload/photo.jpg',
          attachments: [
            { url: 'https://res.cloudinary.com/example/image/upload/photo.jpg' },
            {
              url: 'https://res.cloudinary.com/example/image/upload/photo-2.jpg',
            },
          ],
        },
      ]);

    const result = await social.getMessages('user-id', 'conversation-id');

    expect(result.messages[0]).toMatchObject({
      id: 'message-id',
      attachments: [
        { url: 'https://res.cloudinary.com/example/image/upload/photo.jpg' },
        { url: 'https://res.cloudinary.com/example/image/upload/photo-2.jpg' },
      ],
    });
    expect(result.messages[0]).not.toHaveProperty('cloudinary_public_id');
    expect(result.messages[0]).not.toHaveProperty('attachment_path');
  });

  it('stores and broadcasts multiple chat images after validating conversation membership', async () => {
    const createdAt = new Date('2026-11-08T07:00:00.000Z');
    dataSource.transaction.mockImplementationOnce(
      async (
        callback: (manager: { query: typeof managerQuery }) => unknown,
      ) => callback({ query: managerQuery }),
    );
    cloudinary.uploadImage
      .mockResolvedValueOnce({
        publicId: 'dating/conversations/conversation-id/photo',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/photo.jpg',
      })
      .mockResolvedValueOnce({
        publicId: 'dating/conversations/conversation-id/photo-2',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/photo-2.jpg',
      });
    query.mockResolvedValueOnce([{ id: 'conversation-id' }]);
    managerQuery
      .mockResolvedValueOnce([
        { user_low_id: 'sender-id', user_high_id: 'recipient-id' },
      ])
      .mockResolvedValueOnce([
        {
          id: 'message-id',
          conversation_id: 'conversation-id',
          sender_id: 'sender-id',
          content: 'Đã gửi một ảnh',
          created_at: createdAt,
          cloudinary_public_id: 'dating/conversations/conversation-id/photo',
          attachment_url:
            'https://res.cloudinary.com/example/image/upload/photo.jpg',
        },
      ])
      .mockResolvedValue([]);

    const result = await social.createMessage('sender-id', 'conversation-id', {
      content: '',
      files: [
        {
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
          mimetype: 'image/jpeg',
        },
        {
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
          mimetype: 'image/jpeg',
        },
      ],
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('JOIN matches');
    expect(managerQuery).toHaveBeenCalledTimes(4);
    expect(managerQuery.mock.calls[0]?.[0]).toContain('FOR UPDATE OF m');
    expect(cloudinary.uploadImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      'dating/conversations/conversation-id',
    );
    expect(managerQuery.mock.calls[1]?.[0]).toContain('cloudinary_public_id');
    expect(managerQuery.mock.calls[2]?.[0]).toContain(
      'INSERT INTO message_attachments',
    );
    expect(managerQuery.mock.calls[3]?.[0]).toContain(
      'INSERT INTO message_attachments',
    );
    expect(result.message).toMatchObject({
      id: 'message-id',
      attachment_url:
        'https://res.cloudinary.com/example/image/upload/photo.jpg',
      attachments: [
        { url: 'https://res.cloudinary.com/example/image/upload/photo.jpg' },
        { url: 'https://res.cloudinary.com/example/image/upload/photo-2.jpg' },
      ],
    });
    expect(realtime.emitToUsers).toHaveBeenCalledWith(
      ['sender-id', 'recipient-id'],
      'chat:message',
      result.message,
    );
  });

  it('rejects invalid chat images before uploading any file', async () => {
    query.mockResolvedValueOnce([{ id: 'conversation-id' }]);

    await expect(
      social.createMessage('sender-id', 'conversation-id', {
        content: '',
        files: [
          {
            buffer: Buffer.from('not an image'),
            mimetype: 'image/jpeg',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cloudinary.uploadImage).not.toHaveBeenCalled();
  });
});
