import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformTables1762600000000 implements MigrationInterface {
  name = 'CreatePlatformTables1762600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "profiles"
        ADD COLUMN "verification_status" varchar(24) NOT NULL DEFAULT 'unverified',
        ADD COLUMN "profile_visibility" varchar(24) NOT NULL DEFAULT 'discoverable',
        ADD COLUMN "cover_photo_id" uuid,
        ADD CONSTRAINT "profiles_visibility_valid"
          CHECK ("profile_visibility" IN ('discoverable', 'hidden')),
        ADD CONSTRAINT "profiles_verification_valid"
          CHECK ("verification_status" IN ('unverified', 'pending', 'verified', 'rejected'))
    `);
    await queryRunner.query(`
      CREATE TABLE "profile_photos" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "cloudinary_public_id" text NOT NULL,
        "secure_url" text NOT NULL,
        "sort_order" smallint NOT NULL DEFAULT 0,
        "is_primary" boolean NOT NULL DEFAULT false,
        "role" varchar(12),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "profile_photos_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "profile_photos_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "profile_photos_public_id_unique" UNIQUE ("cloudinary_public_id"),
        CONSTRAINT "profile_photos_sort_order_valid"
          CHECK ("sort_order" BETWEEN 0 AND 5),
        CONSTRAINT "profile_photos_role_valid"
          CHECK ("role" IS NULL OR "role" IN ('avatar', 'cover'))
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "profile_photos_one_primary_per_user"
        ON "profile_photos" ("user_id") WHERE "is_primary"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "profile_photos_one_role_per_user"
        ON "profile_photos" ("user_id", "role") WHERE "role" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "relationship_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_type" text NOT NULL,
        "actor_id" uuid,
        "match_id" uuid,
        "current_couple_id" uuid,
        "current_partner_id" uuid,
        "new_match_partner_id" uuid,
        "occurred_at" timestamptz NOT NULL DEFAULT now(),
        "metadata_minimal" jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "relationship_events_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "relationship_events_actor_fkey"
          FOREIGN KEY ("actor_id") REFERENCES "profiles" ("user_id") ON DELETE SET NULL,
        CONSTRAINT "relationship_events_partner_fkey"
          FOREIGN KEY ("current_partner_id") REFERENCES "profiles" ("user_id") ON DELETE SET NULL,
        CONSTRAINT "relationship_events_new_partner_fkey"
          FOREIGN KEY ("new_match_partner_id") REFERENCES "profiles" ("user_id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recipient_id" uuid NOT NULL,
        "event_id" uuid,
        "type" text NOT NULL,
        "title" text NOT NULL,
        "body" text NOT NULL DEFAULT '',
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "notifications_recipient_fkey"
          FOREIGN KEY ("recipient_id") REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "notifications_event_fkey"
          FOREIGN KEY ("event_id") REFERENCES "relationship_events" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "notifications_event_recipient_type_unique"
        ON "notifications" ("event_id", "recipient_id", "type")
        WHERE "event_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "notifications_recipient_created_idx"
        ON "notifications" ("recipient_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "face_verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "provider" text NOT NULL,
        "provider_session_id" text,
        "status" varchar(24) NOT NULL DEFAULT 'pending',
        "result_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        CONSTRAINT "face_verifications_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "face_verifications_user_fkey"
          FOREIGN KEY ("user_id") REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "face_verifications_provider_session_unique"
          UNIQUE ("provider_session_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "user_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "plan_code" text NOT NULL,
        "status" varchar(24) NOT NULL DEFAULT 'pending',
        "starts_at" timestamptz,
        "expires_at" timestamptz,
        "provider" text,
        "provider_reference" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "user_subscriptions_user_fkey"
          FOREIGN KEY ("user_id") REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "user_subscriptions_provider_reference_unique"
          UNIQUE ("provider_reference"),
        CONSTRAINT "user_subscriptions_dates_valid"
          CHECK ("expires_at" IS NULL OR "starts_at" IS NULL OR "expires_at" > "starts_at")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "subscriptions_active_user_idx"
        ON "user_subscriptions" ("user_id", "expires_at" DESC)
        WHERE "status" = 'active'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user_subscriptions"');
    await queryRunner.query('DROP TABLE "face_verifications"');
    await queryRunner.query('DROP TABLE "notifications"');
    await queryRunner.query('DROP TABLE "relationship_events"');
    await queryRunner.query('DROP TABLE "profile_photos"');
    await queryRunner.query(`
      ALTER TABLE "profiles"
        DROP CONSTRAINT "profiles_verification_valid",
        DROP CONSTRAINT "profiles_visibility_valid",
        DROP COLUMN "cover_photo_id",
        DROP COLUMN "profile_visibility",
        DROP COLUMN "verification_status"
    `);
  }
}
