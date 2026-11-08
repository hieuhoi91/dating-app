import { ForbiddenException } from '@nestjs/common';
import { CoupleService } from './couple.service.js';

describe('CoupleService', () => {
  const realtime = {
    emitToUser: vi.fn(),
    emitToUsers: vi.fn(),
  };
  const cloudinaryDeletion = {
    enqueue: vi.fn(),
    enqueueOutsideTransaction: vi.fn(),
  };

  beforeEach(() => {
    cloudinaryDeletion.enqueue.mockReset();
    cloudinaryDeletion.enqueueOutsideTransaction.mockReset();
    realtime.emitToUser.mockReset();
    realtime.emitToUsers.mockReset();
  });

  it('requires an active member for Couple-owned records', async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([]),
    };
    const service = new CoupleService(
      dataSource as never,
      realtime as never,
      cloudinaryDeletion as never,
    );

    await expect(service.requireMembership('user-id', 'couple-id')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("cm.left_at IS NULL AND c.status = 'active'"),
      ['couple-id', 'user-id'],
    );
  });

  it('returns a null overview when the user has no active Couple', async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([]),
    };
    const service = new CoupleService(
      dataSource as never,
      realtime as never,
      cloudinaryDeletion as never,
    );

    await expect(service.getOverview('user-id')).resolves.toEqual({ couple: null });
  });

  it('includes the sender avatar on incoming Couple invitations', async () => {
    const dataSource = {
      query: vi.fn()
        .mockResolvedValueOnce([{
          id: 'invitation-id',
          sender_id: 'sender-id',
          receiver_id: 'receiver-id',
          status: 'pending',
        }])
        .mockResolvedValueOnce([{
          id: 'sender-id',
          username: 'sender',
          display_name: 'Sender',
          photo_urls: ['https://cdn.example/avatar.jpg'],
        }]),
    };
    const service = new CoupleService(
      dataSource as never,
      realtime as never,
      cloudinaryDeletion as never,
    );

    await expect(service.listInvitations('receiver-id')).resolves.toMatchObject({
      invitations: [{
        sender: {
          id: 'sender-id',
          photo_urls: ['https://cdn.example/avatar.jpg'],
        },
      }],
    });
    expect(dataSource.query.mock.calls[1]?.[0]).toContain('AS photo_urls');
    expect(dataSource.query.mock.calls[1]?.[0]).toContain('profile_photos pp');
  });

  it('accepts a Couple invitation using the active-match partial unique index', async () => {
    const invitation = {
      id: 'invitation-id',
      sender_id: 'sender-id',
      receiver_id: 'receiver-id',
      status: 'pending',
      expires_at: new Date(Date.now() + 60_000),
    };
    const managerQuery = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT * FROM couple_invitations')) return [invitation];
      if (sql.includes('INSERT INTO couples')) return [{ id: 'couple-id' }];
      if (sql.includes('SELECT id, status FROM matches')) {
        return [{ id: 'old-match-id', status: 'ended' }];
      }
      if (sql.includes('INSERT INTO matches')) return [{ id: 'match-id' }];
      if (sql.includes('INSERT INTO relationship_events')) return [{ id: 'event-id' }];
      if (sql.includes('INSERT INTO notifications')) {
        return [{
          id: 'notification-id',
          recipient_id: 'sender-id',
          event_id: 'event-id',
          type: 'couple.invitation.accepted',
          title: 'Lời mời Couple đã được chấp nhận',
          body: 'Hai bạn đã trở thành Couple!',
          read_at: null,
          created_at: new Date(),
        }];
      }
      return [];
    });
    const dataSource = {
      query: vi.fn(),
      transaction: vi.fn(
        (callback: (manager: { query: typeof managerQuery }) => unknown) =>
          callback({ query: managerQuery }),
      ),
    };
    const service = new CoupleService(
      dataSource as never,
      realtime as never,
      cloudinaryDeletion as never,
    );

    await expect(
      service.respondInvitation('receiver-id', 'invitation-id', true),
    ).resolves.toEqual({ coupleId: 'couple-id', status: 'accepted' });

    const matchInsert = managerQuery.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO matches'),
    );
    expect(matchInsert?.[0]).toContain(
      'ON CONFLICT (user_low_id, user_high_id) WHERE status = \'active\' DO UPDATE',
    );
    expect(realtime.emitToUsers).toHaveBeenCalledWith(
      ['receiver-id', 'sender-id'],
      'couple:updated',
      { coupleId: 'couple-id' },
    );
  });

  it('keeps a partner answer private until both members have answered', async () => {
    const dataSource = {
      query: vi.fn()
        .mockResolvedValueOnce([{ couple_id: 'couple-id' }])
        .mockResolvedValueOnce([{
          session_id: 'session-id',
          question_id: 'question-id',
          session_date: '2026-11-08',
        }])
        .mockResolvedValueOnce([{ question: 'A question?' }])
        .mockResolvedValueOnce([{
          session_id: 'session-id',
          question_id: 'question-id',
          scheduled_date: '2026-11-08',
          question_text: 'A question?',
        }])
        .mockResolvedValueOnce([{
          id: 'answer-id',
          user_id: 'user-id',
          answer: 'My answer',
        }]),
    };
    const service = new CoupleService(
      dataSource as never,
      realtime as never,
      cloudinaryDeletion as never,
    );

    await expect(service.getQuestion('user-id', 'couple-id')).resolves.toEqual({
      session: {
        session_id: 'session-id',
        question_id: 'question-id',
        scheduled_date: '2026-11-08',
        question_text: 'A question?',
      },
      answers: [{
        id: 'answer-id',
        user_id: 'user-id',
        answer: 'My answer',
      }],
      userId: 'user-id',
    });
    expect(dataSource.query.mock.calls[4][0]).toContain('a.user_id = $3');
    expect(dataSource.query.mock.calls[4][0]).toContain(
      'WHERE all_answers.session_id = a.session_id) >= 2',
    );
    expect(dataSource.query.mock.calls[4][1]).toEqual([
      'session-id',
      'couple-id',
      'user-id',
    ]);
  });

  it('maps public media links into the legacy signedUrl field', async () => {
    const dataSource = {
      query: vi.fn()
        .mockResolvedValueOnce([{ couple_id: 'couple-id' }])
        .mockResolvedValueOnce([{
          id: 'memory-id', couple_id: 'couple-id', created_by: 'user-id', title: 'Title',
        }])
        .mockResolvedValueOnce([{
          id: 'media-id', memory_id: 'memory-id', secure_url: 'https://cdn.example/image.jpg',
          storage_path: 'https://cdn.example/image.jpg', media_role: 'thumbnail', sort_order: 0,
        }]),
    };
    const service = new CoupleService(
      dataSource as never,
      realtime as never,
      cloudinaryDeletion as never,
    );

    const result = await service.listMemories('user-id', 'couple-id');
    expect(result.memories[0].memory_media[0].signedUrl).toBe('https://cdn.example/image.jpg');
  });

  it('sends feed notifications through the shared notifications table', async () => {
    const dataSource = {
      query: vi.fn()
        .mockResolvedValueOnce([{ couple_id: 'couple-id' }])
        .mockResolvedValueOnce([{ recipient_id: 'partner-id' }])
        .mockResolvedValueOnce([]),
    };
    const service = new CoupleService(
      dataSource as never,
      realtime as never,
      cloudinaryDeletion as never,
    );

    await expect(service.notifyFeedPost('user-id', 'post-id')).resolves.toEqual({ notified: true });
    expect(dataSource.query.mock.calls[2][0]).toContain(
      'INSERT INTO public.notifications (recipient_id, event_id, type, title, body)',
    );
    expect(dataSource.query.mock.calls[2][1]).toEqual([
      'partner-id',
      'couple_feed_post',
      'Người ấy muốn bạn xem bài viết này',
      'Có một bài viết mới trong bảng tin Couple của hai bạn.',
    ]);
  });

  it('queues Couple image deletion in the same transaction as media removal', async () => {
    const managerQuery = vi.fn()
      .mockResolvedValueOnce([{ id: 'media-id', cloudinary_public_id: 'couples/memories/photo' }])
      .mockResolvedValueOnce([]);
    const dataSource = {
      query: vi.fn()
        .mockResolvedValueOnce([{ couple_id: 'couple-id' }])
        .mockResolvedValueOnce([{ user_id: 'user-id' }]),
      transaction: vi.fn((callback: (manager: { query: typeof managerQuery }) => unknown) =>
        callback({ query: managerQuery }),
      ),
    };
    const service = new CoupleService(
      dataSource as never,
      realtime as never,
      cloudinaryDeletion as never,
    );

    await expect(
      service.deleteMemoryMedia('user-id', 'memory-id', 'media-id'),
    ).resolves.toEqual({ deleted: true });

    expect(cloudinaryDeletion.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ query: managerQuery }),
      ['couples/memories/photo'],
    );
    expect(managerQuery.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(managerQuery.mock.calls[1]?.[0]).toContain('DELETE FROM memory_media');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(realtime.emitToUsers).toHaveBeenCalledWith(
      ['user-id'],
      'couple:updated',
      { coupleId: 'couple-id' },
    );
  });
});
