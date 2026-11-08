import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowRematchesAfterBlocking1762700000000
  implements MigrationInterface
{
  name = 'AllowRematchesAfterBlocking1762700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "matches" DROP CONSTRAINT "matches_unique_pair"',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "matches_active_pair_unique"
      ON "matches" ("user_low_id", "user_high_id")
      WHERE "status" = 'active'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "matches_active_pair_unique"');
    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD CONSTRAINT "matches_unique_pair"
      UNIQUE ("user_low_id", "user_high_id")
    `);
  }
}
