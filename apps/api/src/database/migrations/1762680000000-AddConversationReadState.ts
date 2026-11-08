import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationReadState1762680000000
  implements MigrationInterface
{
  name = 'AddConversationReadState1762680000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "conversation_reads" (
        "user_id" uuid NOT NULL,
        "conversation_id" uuid NOT NULL,
        "last_read_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "conversation_reads_pkey"
          PRIMARY KEY ("user_id", "conversation_id"),
        CONSTRAINT "conversation_reads_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "profiles" ("user_id") ON DELETE CASCADE,
        CONSTRAINT "conversation_reads_conversation_id_fkey"
          FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      INSERT INTO "conversation_reads" ("user_id", "conversation_id", "last_read_at")
      SELECT member.user_id, c.id, now()
      FROM "conversations" c
      JOIN "matches" m ON m.id = c.match_id
      CROSS JOIN LATERAL (
        VALUES (m.user_low_id), (m.user_high_id)
      ) AS member(user_id)
      ON CONFLICT ("user_id", "conversation_id") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "conversation_reads"');
  }
}
