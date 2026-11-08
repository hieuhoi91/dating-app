import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetLegacyDiscoveryImpressions1762730000000
  implements MigrationInterface
{
  name = 'ResetLegacyDiscoveryImpressions1762730000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM "discovery_impressions"');
  }

  async down(): Promise<void> {
    throw new Error(
      'Legacy discovery impressions cannot be restored after resetting them.',
    );
  }
}
