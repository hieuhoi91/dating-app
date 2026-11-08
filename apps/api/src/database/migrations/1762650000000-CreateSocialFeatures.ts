import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSocialFeatures1762650000000 implements MigrationInterface {
  name = 'CreateSocialFeatures1762650000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_preferences" (
        "user_id" uuid NOT NULL,
        "interested_in" text[] NOT NULL DEFAULT '{}',
        "age_min" smallint NOT NULL DEFAULT 18,
        "age_max" smallint NOT NULL DEFAULT 99,
        "max_distance_km" smallint NOT NULL DEFAULT 50,
        "interests" text[] NOT NULL DEFAULT '{}',
        "discovery_enabled" boolean NOT NULL DEFAULT true,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id"),
        CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "user_preferences_age_min_valid" CHECK ("age_min" BETWEEN 18 AND 99),
        CONSTRAINT "user_preferences_age_max_valid" CHECK ("age_max" BETWEEN "age_min" AND 99),
        CONSTRAINT "user_preferences_distance_valid" CHECK ("max_distance_km" BETWEEN 1 AND 500)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "user_settings" (
        "user_id" uuid NOT NULL,
        "profile_visibility" varchar(24) NOT NULL DEFAULT 'discoverable',
        "push_enabled" boolean NOT NULL DEFAULT true,
        "email_enabled" boolean NOT NULL DEFAULT true,
        "privacy_preferences" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "notification_preferences" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id"),
        CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "user_settings_visibility_valid"
          CHECK ("profile_visibility" IN ('discoverable', 'hidden'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "blocks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "blocker_id" uuid NOT NULL,
        "blocked_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "blocks_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "blocks_not_self" CHECK ("blocker_id" <> "blocked_id"),
        CONSTRAINT "blocks_unique_pair" UNIQUE ("blocker_id", "blocked_id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "blocks_blocked_id_idx" ON "blocks" ("blocked_id")',
    );
    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reporter_id" uuid NOT NULL,
        "reported_user_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "status" varchar(24) NOT NULL DEFAULT 'open',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "resolved_at" timestamptz,
        CONSTRAINT "reports_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "reports_reason_valid" CHECK (length(trim("reason")) BETWEEN 2 AND 80),
        CONSTRAINT "reports_description_valid" CHECK (length("description") <= 4000),
        CONSTRAINT "reports_not_self" CHECK ("reporter_id" <> "reported_user_id"),
        CONSTRAINT "reports_status_valid" CHECK ("status" IN ('open', 'reviewing', 'resolved', 'dismissed'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "likes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "from_user_id" uuid NOT NULL,
        "to_user_id" uuid NOT NULL,
        "action" varchar(12) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "likes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "likes_from_user_id_fkey" FOREIGN KEY ("from_user_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "likes_to_user_id_fkey" FOREIGN KEY ("to_user_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "likes_not_self" CHECK ("from_user_id" <> "to_user_id"),
        CONSTRAINT "likes_action_valid" CHECK ("action" IN ('like', 'pass')),
        CONSTRAINT "likes_unique_pair" UNIQUE ("from_user_id", "to_user_id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "likes_received_idx" ON "likes" ("to_user_id", "action", "created_at" DESC)',
    );
    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_low_id" uuid NOT NULL,
        "user_high_id" uuid NOT NULL,
        "status" varchar(12) NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "ended_at" timestamptz,
        CONSTRAINT "matches_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "matches_user_low_id_fkey" FOREIGN KEY ("user_low_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "matches_user_high_id_fkey" FOREIGN KEY ("user_high_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "matches_ordered_users" CHECK ("user_low_id" < "user_high_id"),
        CONSTRAINT "matches_status_valid" CHECK ("status" IN ('active', 'ended')),
        CONSTRAINT "matches_unique_pair" UNIQUE ("user_low_id", "user_high_id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "matches_active_low_idx" ON "matches" ("user_low_id", "created_at" DESC) WHERE "status" = \'active\'',
    );
    await queryRunner.query(
      'CREATE INDEX "matches_active_high_idx" ON "matches" ("user_high_id", "created_at" DESC) WHERE "status" = \'active\'',
    );
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "match_id" uuid NOT NULL,
        "status" varchar(12) NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "conversations_match_id_fkey" FOREIGN KEY ("match_id")
          REFERENCES "matches" ("id") ON DELETE CASCADE,
        CONSTRAINT "conversations_match_id_unique" UNIQUE ("match_id"),
        CONSTRAINT "conversations_status_valid" CHECK ("status" IN ('active', 'archived', 'deleted'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "content" text NOT NULL,
        "attachment_path" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id")
          REFERENCES "conversations" ("id") ON DELETE CASCADE,
        CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id")
          REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "messages_content_valid" CHECK (length(trim("content")) BETWEEN 1 AND 5000)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "messages_conversation_created_idx" ON "messages" ("conversation_id", "created_at" DESC)',
    );
    await queryRunner.query(`
      INSERT INTO "user_preferences" ("user_id")
      SELECT "user_id" FROM "profiles"
      ON CONFLICT ("user_id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "user_settings" ("user_id", "profile_visibility")
      SELECT "user_id", "profile_visibility" FROM "profiles"
      ON CONFLICT ("user_id") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "messages"');
    await queryRunner.query('DROP TABLE "conversations"');
    await queryRunner.query('DROP TABLE "matches"');
    await queryRunner.query('DROP TABLE "likes"');
    await queryRunner.query('DROP TABLE "reports"');
    await queryRunner.query('DROP TABLE "blocks"');
    await queryRunner.query('DROP TABLE "user_settings"');
    await queryRunner.query('DROP TABLE "user_preferences"');
  }
}
