import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoupleSchema1762660000000 implements MigrationInterface {
  name = 'CreateCoupleSchema1762660000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "couples" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "status" varchar(16) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'ended')),
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "ended_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "couple_members" (
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        "left_at" timestamptz,
        PRIMARY KEY ("couple_id", "user_id")
      );
      CREATE UNIQUE INDEX "couple_members_one_active_user_idx"
        ON "couple_members"("user_id") WHERE "left_at" IS NULL;
      CREATE TABLE "couple_invitations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "receiver_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "status" varchar(16) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
        "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "responded_at" timestamptz,
        CHECK ("sender_id" <> "receiver_id")
      );
      CREATE UNIQUE INDEX "couple_invitations_pending_pair_idx"
        ON "couple_invitations" (LEAST("sender_id", "receiver_id"), GREATEST("sender_id", "receiver_id"))
        WHERE "status" = 'pending';
      CREATE INDEX "couple_invitations_sender_created_idx" ON "couple_invitations"("sender_id", "created_at" DESC);
      CREATE INDEX "couple_invitations_receiver_created_idx" ON "couple_invitations"("receiver_id", "created_at" DESC);
      CREATE TABLE "couple_questions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO "couple_questions" ("question") VALUES
        ('Điều nhỏ nhặt nào hôm nay khiến bạn cảm thấy được yêu thương?'),
        ('Kỷ niệm nào của hai bạn luôn khiến bạn mỉm cười?'),
        ('Bạn muốn cùng người ấy thử điều gì trong tháng này?'),
        ('Bạn trân trọng nhất điều gì ở người ấy?'),
        ('Một buổi hẹn lý tưởng của hai bạn sẽ như thế nào?'),
        ('Có điều gì bạn muốn cảm ơn người ấy hôm nay?'),
        ('Bạn muốn hai bạn cùng xây dựng thói quen nào?');
      CREATE TABLE "couple_question_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "question_id" uuid NOT NULL REFERENCES "couple_questions"("id"),
        "session_date" date NOT NULL DEFAULT CURRENT_DATE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("couple_id", "session_date")
      );
      CREATE TABLE "couple_answers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL REFERENCES "couple_question_sessions"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "answer" text NOT NULL CHECK (length("answer") BETWEEN 1 AND 5000),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("session_id", "user_id")
      );
      CREATE TABLE "love_challenges" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(160) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "duration_days" integer NOT NULL DEFAULT 1 CHECK ("duration_days" > 0),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO "love_challenges" ("title", "description", "duration_days") VALUES
        ('Lời cảm ơn mỗi ngày', 'Mỗi ngày hãy chia sẻ một điều bạn biết ơn ở người ấy.', 7),
        ('Buổi hẹn không màn hình', 'Dành thời gian chất lượng bên nhau mà không dùng điện thoại.', 1),
        ('Cùng khám phá', 'Cùng nhau thử một địa điểm hoặc hoạt động mới.', 1);
      CREATE TABLE "couple_challenge_progress" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "challenge_id" uuid NOT NULL REFERENCES "love_challenges"("id"),
        "status" varchar(16) NOT NULL DEFAULT 'in_progress' CHECK ("status" IN ('in_progress', 'completed', 'skipped')),
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "couple_date_plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "title" varchar(160) NOT NULL,
        "starts_at" timestamptz NOT NULL,
        "location" varchar(300) NOT NULL DEFAULT '',
        "notes" varchar(3000) NOT NULL DEFAULT '',
        "status" varchar(16) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'archived', 'deleted')),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "couple_journal_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "title" varchar(160) NOT NULL,
        "body" text NOT NULL,
        "entry_date" date NOT NULL DEFAULT CURRENT_DATE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "memories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "title" varchar(160) NOT NULL,
        "description" varchar(5000) NOT NULL DEFAULT '',
        "memory_date" date NOT NULL DEFAULT CURRENT_DATE,
        "status" varchar(16) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'archived', 'deleted')),
        "is_public" boolean NOT NULL DEFAULT false,
        "location_name" varchar(180) NOT NULL DEFAULT '',
        "location_area" varchar(180) NOT NULL DEFAULT '',
        "location_latitude" double precision,
        "location_longitude" double precision,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("location_latitude" IS NULL OR "location_latitude" BETWEEN -90 AND 90),
        CHECK ("location_longitude" IS NULL OR "location_longitude" BETWEEN -180 AND 180)
      );
      CREATE TABLE "memory_media" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "memory_id" uuid NOT NULL REFERENCES "memories"("id") ON DELETE CASCADE,
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "storage_path" varchar(255) NOT NULL,
        "secure_url" text NOT NULL,
        "cloudinary_public_id" varchar(255) NOT NULL,
        "media_role" varchar(16) NOT NULL CHECK ("media_role" IN ('thumbnail', 'gallery')),
        "sort_order" integer NOT NULL DEFAULT 0 CHECK ("sort_order" BETWEEN 0 AND 20),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "couple_feed_posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "content" varchar(3000) NOT NULL,
        "location_name" varchar(180) NOT NULL DEFAULT '',
        "location_area" varchar(180) NOT NULL DEFAULT '',
        "location_latitude" double precision,
        "location_longitude" double precision,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "couple_feed_media" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "post_id" uuid NOT NULL REFERENCES "couple_feed_posts"("id") ON DELETE CASCADE,
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "storage_path" varchar(255) NOT NULL,
        "secure_url" text NOT NULL,
        "cloudinary_public_id" varchar(255) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "couple_feed_reactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "post_id" uuid NOT NULL REFERENCES "couple_feed_posts"("id") ON DELETE CASCADE,
        "couple_id" uuid NOT NULL REFERENCES "couples"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "reaction" varchar(16) NOT NULL CHECK ("reaction" IN ('heart', 'love', 'laugh', 'wow')),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("post_id", "user_id")
      );
      CREATE INDEX "couple_members_active_couple_idx" ON "couple_members"("couple_id") WHERE "left_at" IS NULL;
      CREATE INDEX "couple_journal_entries_couple_date_idx" ON "couple_journal_entries"("couple_id", "entry_date" DESC);
      CREATE INDEX "memories_couple_date_idx" ON "memories"("couple_id", "memory_date" DESC);
      CREATE INDEX "couple_feed_posts_couple_created_idx" ON "couple_feed_posts"("couple_id", "created_at" DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "couple_feed_reactions";
      DROP TABLE "couple_feed_media";
      DROP TABLE "couple_feed_posts";
      DROP TABLE "memory_media";
      DROP TABLE "memories";
      DROP TABLE "couple_journal_entries";
      DROP TABLE "couple_date_plans";
      DROP TABLE "couple_challenge_progress";
      DROP TABLE "love_challenges";
      DROP TABLE "couple_answers";
      DROP TABLE "couple_question_sessions";
      DROP TABLE "couple_questions";
      DROP TABLE "couple_invitations";
      DROP TABLE "couple_members";
      DROP TABLE "couples";
    `);
  }
}
