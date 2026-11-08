import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCloudinaryDeletionQueue1762670000000
  implements MigrationInterface
{
  name = 'CreateCloudinaryDeletionQueue1762670000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
        ADD COLUMN "cloudinary_public_id" text
    `);
    await queryRunner.query(`
      ALTER TABLE "messages"
        ADD COLUMN "attachment_url" text
    `);
    await queryRunner.query(`
      CREATE TABLE "cloudinary_deletion_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "public_id" text NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "next_attempt_at" timestamptz NOT NULL DEFAULT now(),
        "locked_until" timestamptz,
        "last_error" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "cloudinary_deletion_jobs_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "cloudinary_deletion_jobs_public_id_unique" UNIQUE ("public_id"),
        CONSTRAINT "cloudinary_deletion_jobs_attempts_valid" CHECK ("attempts" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "cloudinary_deletion_jobs_pending_idx"
        ON "cloudinary_deletion_jobs" ("next_attempt_at", "created_at")
        WHERE "locked_until" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "cloudinary_deletion_jobs"');
    await queryRunner.query(`
      ALTER TABLE "messages"
        DROP COLUMN "attachment_url",
        DROP COLUMN "cloudinary_public_id"
    `);
  }
}
