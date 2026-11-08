import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageAttachments1762690000000
  implements MigrationInterface
{
  name = 'AddMessageAttachments1762690000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "message_attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "message_id" uuid NOT NULL,
        "cloudinary_public_id" varchar(255) NOT NULL,
        "attachment_url" text NOT NULL,
        "sort_order" smallint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "message_attachments_message_id_fkey"
          FOREIGN KEY ("message_id") REFERENCES "messages" ("id") ON DELETE CASCADE,
        CONSTRAINT "message_attachments_message_sort_unique"
          UNIQUE ("message_id", "sort_order")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "message_attachments_message_id_idx"
      ON "message_attachments" ("message_id", "sort_order")
    `);
    await queryRunner.query(`
      INSERT INTO "message_attachments"
        ("message_id", "cloudinary_public_id", "attachment_url", "sort_order")
      SELECT "id", "cloudinary_public_id", "attachment_url", 0
      FROM "messages"
      WHERE "cloudinary_public_id" IS NOT NULL AND "attachment_url" IS NOT NULL
      ON CONFLICT ("message_id", "sort_order") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "message_attachments"');
  }
}
