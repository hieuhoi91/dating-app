import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDailyDiscoveryQuota1762720000000
  implements MigrationInterface
{
  name = 'AddDailyDiscoveryQuota1762720000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "discovery_impressions" (
        "user_id" uuid NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
        "target_user_id" uuid NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
        "impression_date" date NOT NULL,
        CONSTRAINT "discovery_impressions_pkey"
          PRIMARY KEY ("user_id", "target_user_id", "impression_date"),
        CONSTRAINT "discovery_impressions_not_self"
          CHECK ("user_id" <> "target_user_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "discovery_unblock_history" (
        "user_id" uuid NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
        "target_user_id" uuid NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
        "unblocked_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "discovery_unblock_history_pkey"
          PRIMARY KEY ("user_id", "target_user_id"),
        CONSTRAINT "discovery_unblock_history_not_self"
          CHECK ("user_id" <> "target_user_id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "discovery_unblock_history"');
    await queryRunner.query('DROP TABLE "discovery_impressions"');
  }
}
