import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentitySchema1762580000000 implements MigrationInterface {
  name = 'CreateIdentitySchema1762580000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(254) NOT NULL,
        "password_hash" varchar(255),
        "google_subject" varchar(255),
        "email_verified" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "users_email_unique" UNIQUE ("email"),
        CONSTRAINT "users_google_subject_unique" UNIQUE ("google_subject")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "profiles" (
        "user_id" uuid NOT NULL,
        "username" varchar(30),
        "display_name" varchar(80) NOT NULL DEFAULT '',
        "gender" varchar(40),
        "bio" text NOT NULL DEFAULT '',
        "coarse_location" varchar(120),
        "is_complete" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id"),
        CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "profiles_username_unique" UNIQUE ("username"),
        CONSTRAINT "profiles_username_format" CHECK ("username" IS NULL OR "username" ~ '^[a-z0-9_]{3,30}$'),
        CONSTRAINT "profiles_gender_valid" CHECK ("gender" IS NULL OR "gender" IN ('Nữ', 'Nam', 'Khác', 'Không muốn chia sẻ'))
      )
    `);
    await queryRunner.query(`
      CREATE SCHEMA IF NOT EXISTS "private";
      REVOKE ALL ON SCHEMA "private" FROM PUBLIC;
      CREATE TABLE "private"."user_personal_data" (
        "user_id" uuid NOT NULL,
        "date_of_birth" date,
        "latitude" double precision,
        "longitude" double precision,
        CONSTRAINT "user_personal_data_pkey" PRIMARY KEY ("user_id"),
        CONSTRAINT "user_personal_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "user_personal_data_latitude_range" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
        CONSTRAINT "user_personal_data_longitude_range" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
        CONSTRAINT "user_personal_data_adult_only" CHECK ("date_of_birth" IS NULL OR "date_of_birth" <= (CURRENT_DATE - INTERVAL '18 years')::date)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "refresh_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "refresh_sessions_token_hash_unique" UNIQUE ("token_hash")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "refresh_sessions_user_id_idx" ON "refresh_sessions" ("user_id")',
    );
    await queryRunner.query(`
      CREATE TABLE "email_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "type" varchar(24) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "email_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "email_tokens_hash_type_unique" UNIQUE ("token_hash", "type"),
        CONSTRAINT "email_tokens_type_valid" CHECK ("type" IN ('verification', 'password_reset'))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "email_tokens_user_type_idx" ON "email_tokens" ("user_id", "type")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "email_tokens"');
    await queryRunner.query('DROP TABLE "refresh_sessions"');
    await queryRunner.query('DROP TABLE "private"."user_personal_data"');
    await queryRunner.query('DROP TABLE "profiles"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'private'
        ) THEN
          DROP SCHEMA "private";
        END IF;
      END $$;
    `);
  }
}
