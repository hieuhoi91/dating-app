import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { CloudinaryDeletionService } from '../storage/cloudinary-deletion.service.js';

type Row = Record<string, any>;

@Injectable()
export class CoupleService {
  private readonly logger = new Logger(CoupleService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimeGateway,
    private readonly cloudinaryDeletion: CloudinaryDeletionService,
  ) {}

  private async rows<T extends Row = Row>(sql: string, values: unknown[] = []) {
    return (await this.dataSource.query(sql, values)) as T[];
  }

  private async queueOrphanedUpload(publicId: string): Promise<void> {
    try {
      await this.cloudinaryDeletion.enqueueOutsideTransaction(publicId);
    } catch (error) {
      this.logger.error(
        `Could not queue orphaned Couple image ${publicId}.`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async requireMembership(userId: string, coupleId: string) {
    const [membership] = await this.rows(
      `SELECT cm.couple_id, cm.user_id, cm.joined_at
       FROM couple_members cm JOIN couples c ON c.id = cm.couple_id
       WHERE cm.couple_id = $1 AND cm.user_id = $2 AND cm.left_at IS NULL AND c.status = 'active'`,
      [coupleId, userId],
    );
    if (!membership) {
      throw new ForbiddenException('Bạn không thuộc Couple đang hoạt động này.');
    }
    return membership;
  }

  private async recordCouple(table: string, id: string, userId: string) {
    const allowed = new Set([
      'couple_challenge_progress',
      'couple_date_plans',
      'couple_journal_entries',
      'memories',
      'couple_feed_posts',
    ]);
    if (!allowed.has(table)) throw new Error('Unsupported Couple record table.');
    const [record] = await this.rows(
      `SELECT r.couple_id FROM ${table} r
       JOIN couple_members cm ON cm.couple_id = r.couple_id
       JOIN couples c ON c.id = cm.couple_id
       WHERE r.id = $1 AND cm.user_id = $2 AND cm.left_at IS NULL AND c.status = 'active'`,
      [id, userId],
    );
    if (!record) throw new NotFoundException('Không tìm thấy dữ liệu Couple.');
    return record.couple_id as string;
  }

  async authorizeRecord(table: string, id: string, userId: string) {
    return this.recordCouple(table, id, userId);
  }

  async getOverview(userId: string) {
    const [membership] = await this.rows(
      `SELECT couple_id, joined_at FROM couple_members WHERE user_id = $1 AND left_at IS NULL`,
      [userId],
    );
    if (!membership) return { couple: null };
    const [couple] = await this.rows(
      `SELECT id, status, started_at, ended_at FROM couples WHERE id = $1`,
      [membership.couple_id],
    );
    const members = await this.rows(
      `SELECT user_id, joined_at FROM couple_members WHERE couple_id = $1 AND left_at IS NULL ORDER BY joined_at`,
      [membership.couple_id],
    );
    const partnerId = members.find((member) => member.user_id !== userId)?.user_id;
    let partner = null;
    if (partnerId) {
      [partner] = await this.rows(
        `SELECT user_id AS id, username, display_name FROM profiles WHERE user_id = $1`,
        [partnerId],
      );
    }
    return { couple: { ...couple, members, partner: partner ?? null } };
  }

  async endCouple(userId: string, coupleId: string) {
    await this.requireMembership(userId, coupleId);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE couples SET status = 'ended', ended_at = now() WHERE id = $1 AND status = 'active'`,
        [coupleId],
      );
      await manager.query(
        `UPDATE couple_members SET left_at = now() WHERE couple_id = $1 AND left_at IS NULL`,
        [coupleId],
      );
    });
    return { ended: true };
  }

  async listInvitations(userId: string) {
    const invitations = await this.rows(
      `SELECT id, sender_id, receiver_id, status, expires_at, created_at, responded_at
       FROM couple_invitations WHERE sender_id = $1 OR receiver_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    const profiles = await this.rows(
      `SELECT user_id AS id, username, display_name FROM profiles
       WHERE user_id = ANY($1::uuid[])`,
      [[...new Set(invitations.flatMap((item) => [item.sender_id, item.receiver_id]))]],
    );
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));
    return {
      invitations: invitations.map((item) => ({
        ...item,
        sender: byId.get(item.sender_id) ?? null,
        receiver: byId.get(item.receiver_id) ?? null,
      })),
    };
  }

  async createInvitation(userId: string, input: { identifier?: string; targetUserId?: string }) {
    await this.assertNoActiveMembership(userId);
    let target: Row | undefined;
    if (input.targetUserId) {
      [target] = await this.rows(
        `SELECT id FROM users WHERE id = $1`,
        [input.targetUserId],
      );
    } else if (input.identifier) {
      const identifier = input.identifier.trim().replace(/^@/, '').toLowerCase();
      [target] = await this.rows(
        `SELECT u.id FROM users u LEFT JOIN profiles p ON p.user_id = u.id
         WHERE lower(u.email) = lower($1) OR lower(p.username) = $1 LIMIT 1`,
        [identifier],
      );
    }
    if (!target || target.id === userId) {
      return {
        invitationId: null,
        message: 'Nếu tài khoản phù hợp tồn tại, lời mời sẽ xuất hiện trong Couple của người nhận.',
        statusCode: 202,
      };
    }
    await this.assertNoActiveMembership(target.id);
    const [pending] = await this.rows(
      `SELECT id FROM couple_invitations
       WHERE status = 'pending' AND expires_at > now()
         AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
      [userId, target.id],
    );
    if (pending) throw new ConflictException('Đã có lời mời đang chờ xử lý giữa hai tài khoản.');
    try {
      const { invitation, notification } = await this.dataSource.transaction(
        async (manager) => {
          const [createdInvitation] = await manager.query(
            `INSERT INTO couple_invitations (sender_id, receiver_id)
             VALUES ($1, $2) RETURNING id`,
            [userId, target.id],
          );
          const [event] = await manager.query(
            `INSERT INTO relationship_events (event_type, actor_id, current_partner_id)
             VALUES ('couple_invitation_created', $1, $2) RETURNING id`,
            [userId, target.id],
          );
          const [createdNotification] = await manager.query(
            `INSERT INTO notifications (recipient_id, event_id, type, title, body)
             SELECT $2, $1, 'couple.invitation', 'Bạn nhận được lời mời Couple',
                    COALESCE(NULLIF(p.display_name, ''), 'Một người dùng') ||
                      ' muốn trở thành Couple với bạn.'
             FROM profiles p WHERE p.user_id = $3
             RETURNING id, recipient_id, event_id, type, title, body, read_at, created_at`,
            [event.id, target.id, userId],
          );
          return {
            invitation: createdInvitation,
            notification: createdNotification,
          };
        },
      );
      this.realtime.emitToUser(target.id, 'notification:new', notification);
      this.realtime.emitToUser(target.id, 'couple:updated', {});
      return {
        invitationId: invitation.id,
        message: 'Nếu tài khoản phù hợp tồn tại, lời mời sẽ xuất hiện trong Couple của người nhận.',
        statusCode: 201,
      };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Lời mời chưa thể gửi: đã có lời mời chờ xử lý.');
      }
      throw error;
    }
  }

  private async assertNoActiveMembership(userId: string) {
    const [membership] = await this.rows(
      `SELECT couple_id FROM couple_members WHERE user_id = $1 AND left_at IS NULL`,
      [userId],
    );
    if (membership) throw new ConflictException('Mỗi tài khoản chỉ tham gia một Couple đang hoạt động.');
  }

  async cancelInvitation(userId: string, invitationId: string) {
    const result = await this.rows(
      `UPDATE couple_invitations SET status = 'cancelled', responded_at = now()
       WHERE id = $1 AND sender_id = $2 AND status = 'pending' AND expires_at > now()
       RETURNING id`,
      [invitationId, userId],
    );
    if (!result.length) {
      throw new ConflictException('Lời mời không còn chờ xử lý hoặc bạn không có quyền hủy.');
    }
    return { cancelled: true };
  }

  async respondInvitation(userId: string, invitationId: string, accept: boolean) {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const [invitation] = await manager.query(
        `SELECT * FROM couple_invitations WHERE id = $1 FOR UPDATE`,
        [invitationId],
      );
      if (!invitation || invitation.receiver_id !== userId) {
        throw new NotFoundException('Không tìm thấy lời mời.');
      }
      if (invitation.status !== 'pending' || new Date(invitation.expires_at) <= new Date()) {
        return {
          coupleId: null,
          status: invitation.status === 'pending' ? 'expired' : invitation.status,
          senderId: invitation.sender_id as string,
          notification: null,
        };
      }
      if (!accept) {
        await manager.query(
          `UPDATE couple_invitations SET status = 'declined', responded_at = now() WHERE id = $1`,
          [invitationId],
        );
        return {
          coupleId: null,
          status: 'declined',
          senderId: invitation.sender_id as string,
          notification: null,
        };
      }
      await manager.query(
        `SELECT id FROM users WHERE id = ANY($1::uuid[]) FOR UPDATE`,
        [[invitation.sender_id, invitation.receiver_id]],
      );
      const active = await manager.query(
        `SELECT user_id FROM couple_members WHERE user_id = ANY($1::uuid[]) AND left_at IS NULL`,
        [[invitation.sender_id, invitation.receiver_id]],
      );
      if (active.length) throw new ConflictException('Bạn hoặc người gửi đã thuộc một Couple đang hoạt động.');
      const [couple] = await manager.query(
        `INSERT INTO couples DEFAULT VALUES RETURNING id`,
      );
      await manager.query(
        `INSERT INTO couple_members (couple_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [couple.id, invitation.sender_id, invitation.receiver_id],
      );
      await manager.query(
        `UPDATE couple_invitations SET status = 'accepted', responded_at = now() WHERE id = $1`,
        [invitationId],
      );
      await manager.query(
        `UPDATE couple_invitations SET status = 'expired', responded_at = now()
         WHERE status = 'pending' AND (sender_id = ANY($1::uuid[]) OR receiver_id = ANY($1::uuid[]))`,
        [[invitation.sender_id, invitation.receiver_id]],
      );
      const [existingMatch] = await manager.query<
        Array<{ id: string; status: string }>
      >(
        `SELECT id, status FROM matches
         WHERE user_low_id = LEAST($1::uuid, $2::uuid)
           AND user_high_id = GREATEST($1::uuid, $2::uuid)
         FOR UPDATE`,
        [invitation.sender_id, invitation.receiver_id],
      );
      const [match] = await manager.query(
        `INSERT INTO matches (user_low_id, user_high_id)
         VALUES (
           LEAST($1::uuid, $2::uuid),
           GREATEST($1::uuid, $2::uuid)
         )
         ON CONFLICT (user_low_id, user_high_id) DO UPDATE
           SET status = 'active', ended_at = NULL
         RETURNING id`,
        [invitation.sender_id, invitation.receiver_id],
      );
      await manager.query(
        `INSERT INTO conversations (match_id) VALUES ($1)
         ON CONFLICT (match_id) DO UPDATE SET status = 'active'`,
        [match.id],
      );
      const [event] = await manager.query(
        `INSERT INTO relationship_events
           (event_type, actor_id, match_id, current_couple_id, current_partner_id)
         VALUES ('couple_invitation_accepted', $1, $2, $3, $4) RETURNING id`,
        [userId, match.id, couple.id, invitation.sender_id],
      );
      const [notification] = await manager.query(
        `INSERT INTO notifications (recipient_id, event_id, type, title, body)
         VALUES ($1, $2, 'couple.invitation.accepted',
                 'Lời mời Couple đã được chấp nhận',
                 'Hai bạn đã trở thành Couple!') 
         RETURNING id, recipient_id, event_id, type, title, body, read_at, created_at`,
        [invitation.sender_id, event.id],
      );
      return {
        coupleId: couple.id as string,
        status: 'accepted',
        senderId: invitation.sender_id as string,
        notification,
        matchId:
          existingMatch?.status === 'active' ? null : (match.id as string),
      };
    });
    if (outcome.notification) {
      this.realtime.emitToUser(
        outcome.senderId,
        'notification:new',
        outcome.notification,
      );
    }
    if (outcome.coupleId) {
      this.realtime.emitToUsers(
        [userId, outcome.senderId],
        'couple:updated',
        { coupleId: outcome.coupleId },
      );
      this.realtime.emitToUsers(
        [userId, outcome.senderId],
        'engagement:updated',
        {},
      );
      if (outcome.matchId) {
        this.realtime.emitToUsers(
          [userId, outcome.senderId],
          'engagement:match',
          { id: outcome.matchId, status: 'active' },
        );
      }
    } else {
      this.realtime.emitToUser(outcome.senderId, 'couple:updated', {});
    }
    return {
      coupleId: outcome.coupleId,
      status: outcome.status,
    };
  }

  async getQuestion(userId: string, coupleId: string) {
    await this.requireMembership(userId, coupleId);
    const [session] = await this.rows(
      `INSERT INTO couple_question_sessions (couple_id, question_id, session_date)
       SELECT $1, q.id, CURRENT_DATE FROM couple_questions q
       WHERE q.is_active
       ORDER BY md5(q.id::text || CURRENT_DATE::text) LIMIT 1
       ON CONFLICT (couple_id, session_date) DO UPDATE SET couple_id = EXCLUDED.couple_id
       RETURNING id AS session_id, question_id, session_date`,
      [coupleId],
    );
    if (!session) return { session: null, answers: [], userId };
    const [question] = await this.rows(
      `SELECT question FROM couple_questions WHERE id = $1`,
      [session.question_id],
    );
    const [result] = await this.rows(
      `SELECT $1::uuid AS session_id, $2::uuid AS question_id,
              $3::date AS scheduled_date, $4::text AS question_text`,
      [
        session.session_id,
        session.question_id,
        session.session_date,
        question?.question ?? null,
      ],
    );
    const answers = await this.rows(
      `SELECT a.id, a.user_id, a.answer, a.created_at, a.updated_at
       FROM couple_answers a JOIN couple_question_sessions s ON s.id = a.session_id
       WHERE a.session_id = $1 AND s.couple_id = $2
         AND (
           a.user_id = $3
           OR (SELECT count(*) FROM couple_answers all_answers
               WHERE all_answers.session_id = a.session_id) >= 2
         )`,
      [session.session_id, coupleId, userId],
    );
    return { session: result, answers, userId };
  }

  async submitAnswer(userId: string, sessionId: string, answer: string) {
    const [session] = await this.rows(
      `SELECT couple_id FROM couple_question_sessions WHERE id = $1`,
      [sessionId],
    );
    if (!session) throw new NotFoundException('Không tìm thấy phiên câu hỏi.');
    await this.requireMembership(userId, session.couple_id);
    const [result] = await this.rows(
      `INSERT INTO couple_answers (session_id, user_id, answer)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, user_id) DO UPDATE SET answer = EXCLUDED.answer, updated_at = now()
       RETURNING id`,
      [sessionId, userId, answer],
    );
    return { answerId: result.id };
  }

  async listChallenges(userId: string, coupleId: string) {
    await this.requireMembership(userId, coupleId);
    const [challenges, progress] = await Promise.all([
      this.rows(`SELECT id, title, description, duration_days FROM love_challenges WHERE is_active ORDER BY created_at`),
      this.rows(
        `SELECT id, challenge_id, status, started_at, completed_at, created_by
         FROM couple_challenge_progress WHERE couple_id = $1 ORDER BY started_at DESC`,
        [coupleId],
      ),
    ]);
    return { challenges, progress };
  }

  async startChallenge(userId: string, input: { coupleId: string; challengeId: string; status: string }) {
    await this.requireMembership(userId, input.coupleId);
    const [challenge] = await this.rows(
      `SELECT id FROM love_challenges WHERE id = $1 AND is_active`,
      [input.challengeId],
    );
    if (!challenge) throw new NotFoundException('Không tìm thấy thử thách.');
    const [progress] = await this.rows(
      `INSERT INTO couple_challenge_progress (couple_id, challenge_id, created_by, status, completed_at)
       VALUES ($1, $2, $3, $4, CASE WHEN $4 = 'completed' THEN now() END)
       RETURNING id, couple_id, challenge_id, status, started_at, created_by`,
      [input.coupleId, input.challengeId, userId, input.status],
    );
    return { progress };
  }

  async updateChallenge(userId: string, id: string, status: string) {
    await this.recordCouple('couple_challenge_progress', id, userId);
    const [progress] = await this.rows(
      `UPDATE couple_challenge_progress SET status = $2,
       completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END
       WHERE id = $1 RETURNING id, status, completed_at`,
      [id, status],
    );
    return { progress };
  }

  async listDatePlans(userId: string, coupleId: string) {
    await this.requireMembership(userId, coupleId);
    return {
      plans: await this.rows(
        `SELECT id, couple_id, created_by, title, starts_at, location, notes, status, created_at
         FROM couple_date_plans WHERE couple_id = $1 ORDER BY starts_at`,
        [coupleId],
      ),
    };
  }

  async createDatePlan(userId: string, input: Row) {
    await this.requireMembership(userId, input.coupleId);
    const [plan] = await this.rows(
      `INSERT INTO couple_date_plans (couple_id, created_by, title, starts_at, location, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, couple_id, created_by, title, starts_at, location, notes, status, created_at`,
      [input.coupleId, userId, input.title, input.startsAt, input.location ?? '', input.notes ?? ''],
    );
    return { plan };
  }

  async updateDatePlan(userId: string, id: string, input: Row) {
    await this.recordCouple('couple_date_plans', id, userId);
    const columns: Record<string, string> = {
      title: 'title',
      starts_at: 'starts_at',
      location: 'location',
      notes: 'notes',
      status: 'status',
    };
    return {
      plan: await this.updateRecord('couple_date_plans', id, input, columns,
        'id, title, starts_at, location, notes, status'),
    };
  }

  async deleteDatePlan(userId: string, id: string) {
    await this.recordCouple('couple_date_plans', id, userId);
    await this.rows(`DELETE FROM couple_date_plans WHERE id = $1`, [id]);
    return { deleted: true };
  }

  async listJournal(userId: string, coupleId: string) {
    await this.requireMembership(userId, coupleId);
    return {
      entries: await this.rows(
        `SELECT id, couple_id, created_by, title, body, entry_date, created_at, updated_at
         FROM couple_journal_entries WHERE couple_id = $1 ORDER BY entry_date DESC`,
        [coupleId],
      ),
    };
  }

  async createJournal(userId: string, input: Row) {
    await this.requireMembership(userId, input.coupleId);
    const [entry] = await this.rows(
      `INSERT INTO couple_journal_entries (couple_id, created_by, title, body, entry_date)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE))
       RETURNING id, couple_id, created_by, title, body, entry_date, created_at`,
      [input.coupleId, userId, input.title, input.body, input.entryDate ?? null],
    );
    return { entry };
  }

  async updateJournal(userId: string, id: string, input: Row) {
    await this.recordCouple('couple_journal_entries', id, userId);
    return {
      entry: await this.updateRecord(
        'couple_journal_entries', id, input,
        { title: 'title', body: 'body', entry_date: 'entry_date' },
        'id, title, body, entry_date, updated_at',
        true,
      ),
    };
  }

  async deleteJournal(userId: string, id: string) {
    await this.recordCouple('couple_journal_entries', id, userId);
    await this.rows(`DELETE FROM couple_journal_entries WHERE id = $1`, [id]);
    return { deleted: true };
  }

  async listMemories(userId: string, coupleId: string) {
    await this.requireMembership(userId, coupleId);
    const memories = await this.rows(
      `SELECT id, couple_id, created_by, title, description, memory_date, status, is_public,
       location_name, location_area, location_latitude, location_longitude, created_at, updated_at
       FROM memories WHERE couple_id = $1 AND status = 'active' ORDER BY memory_date DESC`,
      [coupleId],
    );
    const ids = memories.map((memory) => memory.id);
    const media = ids.length ? await this.rows(
      `SELECT id, memory_id, storage_path, secure_url, media_role, sort_order
       FROM memory_media WHERE memory_id = ANY($1::uuid[]) ORDER BY sort_order`,
      [ids],
    ) : [];
    return {
      memories: memories.map((memory) => ({
        ...memory,
        memory_media: media.filter((item) => item.memory_id === memory.id)
          .map(({ memory_id: _memoryId, secure_url, ...item }) => ({ ...item, signedUrl: secure_url })),
      })),
    };
  }

  async createMemory(userId: string, input: Row) {
    await this.requireMembership(userId, input.coupleId);
    const [memory] = await this.rows(
      `INSERT INTO memories (couple_id, created_by, title, description, memory_date, location_name,
       location_area, location_latitude, location_longitude, is_public)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, $7, $8, $9, $10)
       RETURNING id, couple_id, created_by, title, description, memory_date, status, is_public,
       location_name, location_area, location_latitude, location_longitude, created_at`,
      [input.coupleId, userId, input.title, input.description ?? '', input.memoryDate ?? null,
        input.locationName ?? '', input.locationArea ?? '', input.locationLatitude ?? null,
        input.locationLongitude ?? null, input.isPublic ?? false],
    );
    return { memory };
  }

  async updateMemory(userId: string, id: string, input: Row) {
    await this.recordCouple('memories', id, userId);
    return {
      memory: await this.updateRecord(
        'memories', id, input,
        {
          title: 'title', description: 'description', memory_date: 'memory_date',
          is_public: 'is_public', location_name: 'location_name', location_area: 'location_area',
        },
        'id, title, description, memory_date, is_public, location_name, location_area, updated_at',
        true,
      ),
    };
  }

  async deleteMemory(userId: string, id: string) {
    const coupleId = await this.recordCouple('memories', id, userId);
    await this.dataSource.transaction(async (manager) => {
      const [memory] = await manager.query<Array<{ id: string }>>(
        'SELECT id FROM memories WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!memory) throw new NotFoundException('Không tìm thấy dữ liệu Couple.');
      const media = await manager.query<Array<{ cloudinary_public_id: string }>>(
        `SELECT cloudinary_public_id FROM memory_media WHERE memory_id = $1`,
        [id],
      );
      await this.cloudinaryDeletion.enqueue(
        manager,
        media.map((item) => item.cloudinary_public_id),
      );
      await manager.query(`DELETE FROM memories WHERE id = $1`, [id]);
    });
    await this.emitCoupleUpdated(coupleId);
    return { deleted: true };
  }

  async listMemoryMedia(userId: string, memoryId: string) {
    await this.recordCouple('memories', memoryId, userId);
    const media = await this.rows(
      `SELECT id, storage_path, secure_url, media_role, sort_order, created_at
       FROM memory_media WHERE memory_id = $1 ORDER BY sort_order`,
      [memoryId],
    );
    return { media: media.map(({ secure_url, ...item }) => ({ ...item, signedUrl: secure_url })) };
  }

  async addMemoryMedia(
    userId: string, memoryId: string, input: { secureUrl: string; publicId: string; role: string; sortOrder: number },
  ) {
    let coupleId: string;
    let media: Row;
    try {
      coupleId = await this.recordCouple('memories', memoryId, userId);
      media = await this.dataSource.transaction(async (manager) => {
        const [memory] = await manager.query(
          `SELECT id FROM memories WHERE id = $1 AND couple_id = $2 FOR UPDATE`,
          [memoryId, coupleId],
        );
        if (!memory) throw new NotFoundException('Không tìm thấy dữ liệu Couple.');
        const [mediaCount] = await manager.query(
          `SELECT count(*)::int AS count FROM memory_media
           WHERE memory_id = $1 AND media_role = $2`,
          [memoryId, input.role],
        );
        const maxCount = input.role === 'thumbnail' ? 1 : 6;
        if (mediaCount.count >= maxCount) {
          throw new BadRequestException(
            input.role === 'thumbnail'
              ? 'Mỗi kỷ niệm chỉ có thể có một ảnh bìa.'
              : 'Mỗi kỷ niệm có thể có tối đa 6 ảnh gallery.',
          );
        }
        if (input.role === 'thumbnail' && input.sortOrder !== 0) {
          throw new BadRequestException('Ảnh bìa phải có thứ tự bằng 0.');
        }
        const [createdMedia] = await manager.query(
          `INSERT INTO memory_media (memory_id, couple_id, created_by, storage_path, secure_url,
           cloudinary_public_id, media_role, sort_order)
           VALUES ($1, $2, $3, $4, $4, $5, $6, $7)
           RETURNING id, storage_path, media_role, sort_order, created_at, secure_url`,
          [
            memoryId,
            coupleId,
            userId,
            input.secureUrl,
            input.publicId,
            input.role,
            input.sortOrder,
          ],
        );
        return createdMedia;
      });
    } catch (error) {
      await this.queueOrphanedUpload(input.publicId);
      throw error;
    }
    const { secure_url, ...rest } = media;
    await this.emitCoupleUpdated(coupleId);
    return { media: { ...rest, signedUrl: secure_url } };
  }

  async deleteMemoryMedia(userId: string, memoryId: string, mediaId: string) {
    const coupleId = await this.recordCouple('memories', memoryId, userId);
    await this.dataSource.transaction(async (manager) => {
      const [media] = await manager.query<
        Array<{ id: string; cloudinary_public_id: string }>
      >(
        `SELECT id, cloudinary_public_id FROM memory_media
         WHERE id = $1 AND memory_id = $2 FOR UPDATE`,
        [mediaId, memoryId],
      );
      if (!media) throw new NotFoundException('Không tìm thấy ảnh.');
      await this.cloudinaryDeletion.enqueue(manager, [
        media.cloudinary_public_id,
      ]);
      await manager.query(
        `DELETE FROM memory_media WHERE id = $1 AND memory_id = $2`,
        [mediaId, memoryId],
      );
    });
    await this.emitCoupleUpdated(coupleId);
    return { deleted: true };
  }

  async listFeed(userId: string, coupleId: string) {
    await this.requireMembership(userId, coupleId);
    const posts = await this.rows(
      `SELECT p.id, p.couple_id, p.created_by, p.content, p.location_name, p.location_area,
       p.location_latitude, p.location_longitude, p.created_at
       FROM couple_feed_posts p ORDER BY p.created_at DESC LIMIT 50`,
    );
    const memories = await this.rows(
      `SELECT id, couple_id, created_by, description, title, created_at, memory_date, location_name,
       location_area, location_latitude, location_longitude
       FROM memories WHERE is_public AND status = 'active' ORDER BY created_at DESC LIMIT 50`,
    );
    const coupleIds = [...new Set([...posts, ...memories].map((item) => item.couple_id))];
    if (!coupleIds.length) return { feed: [] };
    const members = await this.rows(
      `SELECT cm.couple_id, cm.user_id, p.display_name, p.username
       FROM couple_members cm LEFT JOIN profiles p ON p.user_id = cm.user_id
       WHERE cm.couple_id = ANY($1::uuid[]) AND cm.left_at IS NULL`,
      [coupleIds],
    );
    const mediaRows = await this.rows(
      `SELECT id, post_id, storage_path, secure_url, sort_order, 'post' AS kind
       FROM couple_feed_media WHERE post_id = ANY($1::uuid[])
       UNION ALL
       SELECT id, memory_id AS post_id, storage_path, secure_url, sort_order, media_role AS kind
       FROM memory_media WHERE memory_id = ANY($2::uuid[])`,
      [posts.map((item) => item.id), memories.map((item) => item.id)],
    );
    const postIds = posts.map((item) => item.id);
    const reactions = postIds.length ? await this.rows(
      `SELECT id, post_id, user_id, reaction FROM couple_feed_reactions WHERE post_id = ANY($1::uuid[])`,
      [postIds],
    ) : [];
    const memberMap = new Map<string, Row[]>();
    for (const member of members) {
      const items = memberMap.get(member.couple_id) ?? [];
      items.push({
        id: member.user_id,
        name: member.display_name || (member.username ? `@${member.username}` : 'Thành viên Couple'),
        photo: null,
      });
      memberMap.set(member.couple_id, items);
    }
    const feed = [
      ...posts.map((post) => {
        const attached = mediaRows.filter((item) => item.post_id === post.id && item.kind === 'post');
        const postReactions = reactions.filter((item) => item.post_id === post.id);
        const counts: Record<string, number> = {};
        for (const reaction of postReactions) counts[reaction.reaction] = (counts[reaction.reaction] ?? 0) + 1;
        return {
          id: post.id, kind: 'post', coupleId: post.couple_id, createdBy: post.created_by,
          content: post.content, title: null, createdAt: post.created_at, memoryDate: null,
          locationName: post.location_name, locationArea: post.location_area,
          locationLatitude: post.location_latitude, locationLongitude: post.location_longitude,
          members: memberMap.get(post.couple_id) ?? [], reactions: counts,
          myReaction: postReactions.find((item) => item.user_id === userId)?.reaction ?? null,
          photos: attached.sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => ({ id: item.id, role: 'feed', url: item.secure_url })),
        };
      }),
      ...memories.map((memory) => ({
        id: memory.id, kind: 'memory', coupleId: memory.couple_id, createdBy: memory.created_by,
        content: memory.description, title: memory.title, createdAt: memory.created_at,
        memoryDate: memory.memory_date, locationName: memory.location_name, locationArea: memory.location_area,
        locationLatitude: memory.location_latitude, locationLongitude: memory.location_longitude,
        members: memberMap.get(memory.couple_id) ?? [], reactions: {}, myReaction: null,
        photos: mediaRows.filter((item) => item.post_id === memory.id && item.kind !== 'post')
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({ id: item.id, role: item.kind, url: item.secure_url })),
      })),
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 50);
    return { feed };
  }

  async createFeedPost(userId: string, input: Row) {
    await this.requireMembership(userId, input.coupleId);
    const [post] = await this.rows(
      `INSERT INTO couple_feed_posts (couple_id, created_by, content, location_name, location_area,
       location_latitude, location_longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [input.coupleId, userId, input.content, input.locationName ?? '', input.locationArea ?? '',
        input.locationLatitude ?? null, input.locationLongitude ?? null],
    );
    await this.emitCoupleUpdated(input.coupleId);
    return { postId: post.id };
  }

  async deleteFeedPost(userId: string, id: string) {
    const coupleId = await this.recordCouple('couple_feed_posts', id, userId);
    await this.dataSource.transaction(async (manager) => {
      const [post] = await manager.query<Array<{ id: string }>>(
        'SELECT id FROM couple_feed_posts WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!post) throw new NotFoundException('Không tìm thấy dữ liệu Couple.');
      const media = await manager.query<Array<{ cloudinary_public_id: string }>>(
        `SELECT cloudinary_public_id FROM couple_feed_media WHERE post_id = $1`,
        [id],
      );
      await this.cloudinaryDeletion.enqueue(
        manager,
        media.map((item) => item.cloudinary_public_id),
      );
      await manager.query(`DELETE FROM couple_feed_posts WHERE id = $1`, [id]);
    });
    await this.emitCoupleUpdated(coupleId);
    return { deleted: true };
  }

  async addFeedMedia(userId: string, postId: string, secureUrl: string, publicId: string) {
    let coupleId: string;
    let media: Row;
    try {
      coupleId = await this.recordCouple('couple_feed_posts', postId, userId);
      const [count] = await this.rows(
        `SELECT count(*)::int AS count FROM couple_feed_media WHERE post_id = $1`,
        [postId],
      );
      if (count.count >= 6) throw new BadRequestException('Mỗi bài viết có thể tải lên tối đa 6 ảnh.');
      [media] = await this.rows(
        `INSERT INTO couple_feed_media (post_id, couple_id, created_by, storage_path, secure_url,
         cloudinary_public_id, sort_order)
         VALUES ($1, $2, $3, $4, $4, $5, $6) RETURNING id`,
        [postId, coupleId, userId, secureUrl, publicId, count.count],
      );
    } catch (error) {
      await this.queueOrphanedUpload(publicId);
      throw error;
    }
    await this.emitCoupleUpdated(coupleId);
    return { mediaId: media.id };
  }

  async assertCanAddFeedMedia(userId: string, postId: string) {
    await this.recordCouple('couple_feed_posts', postId, userId);
    const [count] = await this.rows(
      `SELECT count(*)::int AS count FROM couple_feed_media WHERE post_id = $1`,
      [postId],
    );
    if (count.count >= 6) throw new BadRequestException('Mỗi bài viết có thể tải lên tối đa 6 ảnh.');
  }

  async setReaction(userId: string, postId: string, coupleId: string, reaction: string) {
    await this.requireMembership(userId, coupleId);
    await this.recordCouple('couple_feed_posts', postId, userId);
    const [post] = await this.rows(`SELECT couple_id FROM couple_feed_posts WHERE id = $1`, [postId]);
    if (post.couple_id !== coupleId) throw new ForbiddenException('Bài viết không thuộc Couple này.');
    await this.rows(
      `INSERT INTO couple_feed_reactions (post_id, couple_id, user_id, reaction)
       VALUES ($1, $2, $3, $4) ON CONFLICT (post_id, user_id)
       DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = now()`,
      [postId, coupleId, userId, reaction],
    );
    await this.emitCoupleUpdated(coupleId);
    return { updated: true };
  }

  async removeReaction(userId: string, postId: string) {
    const coupleId = await this.recordCouple('couple_feed_posts', postId, userId);
    await this.rows(
      `DELETE FROM couple_feed_reactions WHERE post_id = $1 AND user_id = $2 AND couple_id = $3`,
      [postId, userId, coupleId],
    );
    await this.emitCoupleUpdated(coupleId);
    return { removed: true };
  }

  async notifyFeedPost(userId: string, postId: string) {
    const coupleId = await this.recordCouple('couple_feed_posts', postId, userId);
    const [recipient] = await this.rows(
      `SELECT cm.user_id AS recipient_id
       FROM couple_members cm JOIN couples c ON c.id = cm.couple_id
       WHERE cm.couple_id = $1 AND cm.user_id <> $2
         AND cm.left_at IS NULL AND c.status = 'active'
       LIMIT 1`,
      [coupleId, userId],
    );
    if (recipient) {
      const [notification] = await this.rows(
        `INSERT INTO public.notifications (recipient_id, event_id, type, title, body)
         VALUES ($1, NULL, $2, $3, $4)
         RETURNING id, recipient_id, event_id, type, title, body, read_at, created_at`,
        [
          recipient.recipient_id,
          'couple_feed_post',
          'Người ấy muốn bạn xem bài viết này',
          'Có một bài viết mới trong bảng tin Couple của hai bạn.',
        ],
      );
      this.realtime.emitToUser(recipient.recipient_id, 'notification:new', notification);
    }
    return { notified: true };
  }

  private async emitCoupleUpdated(coupleId: string): Promise<void> {
    const members = await this.rows<{ user_id: string }>(
      `SELECT cm.user_id
       FROM couple_members cm JOIN couples c ON c.id = cm.couple_id
       WHERE cm.couple_id = $1 AND cm.left_at IS NULL AND c.status = 'active'`,
      [coupleId],
    );
    this.realtime.emitToUsers(
      members.map((member) => member.user_id),
      'couple:updated',
      { coupleId },
    );
  }

  private async updateRecord(
    table: string, id: string, input: Row, columns: Record<string, string>, returning: string, touch = false,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [id];
    for (const [key, column] of Object.entries(columns)) {
      if (input[key] === undefined) continue;
      values.push(input[key]);
      assignments.push(`"${column}" = $${values.length}`);
    }
    if (!assignments.length) throw new BadRequestException('Không có dữ liệu cập nhật.');
    if (touch) assignments.push('"updated_at" = now()');
    const [row] = await this.rows(
      `UPDATE ${table} SET ${assignments.join(', ')} WHERE id = $1 RETURNING ${returning}`,
      values,
    );
    if (!row) throw new NotFoundException('Không tìm thấy dữ liệu Couple.');
    return row;
  }
}
