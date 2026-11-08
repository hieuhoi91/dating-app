import 'dotenv/config';
import { DataSource } from 'typeorm';
import { CreateIdentitySchema1762580000000 } from './migrations/1762580000000-CreateIdentitySchema.js';
import { CreatePlatformTables1762600000000 } from './migrations/1762600000000-CreatePlatformTables.js';
import { CreateSocialFeatures1762650000000 } from './migrations/1762650000000-CreateSocialFeatures.js';
import { CreateCoupleSchema1762660000000 } from './migrations/1762660000000-CreateCoupleSchema.js';
import { CreateCloudinaryDeletionQueue1762670000000 } from './migrations/1762670000000-CreateCloudinaryDeletionQueue.js';
import { AddConversationReadState1762680000000 } from './migrations/1762680000000-AddConversationReadState.js';
import { AddMessageAttachments1762690000000 } from './migrations/1762690000000-AddMessageAttachments.js';
import { AllowRematchesAfterBlocking1762700000000 } from './migrations/1762700000000-AllowRematchesAfterBlocking.js';
import { CleanBlockedRelationships1762710000000 } from './migrations/1762710000000-CleanBlockedRelationships.js';
import { AddDailyDiscoveryQuota1762720000000 } from './migrations/1762720000000-AddDailyDiscoveryQuota.js';
import { ResetLegacyDiscoveryImpressions1762730000000 } from './migrations/1762730000000-ResetLegacyDiscoveryImpressions.js';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be configured before running migrations.');
  }
  const poolMax = Number(process.env.DATABASE_POOL_MAX ?? 10);
  if (!Number.isInteger(poolMax) || poolMax < 1 || poolMax > 50) {
    throw new Error('DATABASE_POOL_MAX must be an integer between 1 and 50.');
  }
  const shouldRevert = process.argv.includes('--revert');
  const unknownArguments = process.argv.slice(2).filter((arg) => arg !== '--revert');
  if (unknownArguments.length) {
    throw new Error(`Unknown migration argument(s): ${unknownArguments.join(', ')}`);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    migrationsRun: false,
    migrations: [
      CreateIdentitySchema1762580000000,
      CreatePlatformTables1762600000000,
      CreateSocialFeatures1762650000000,
      CreateCoupleSchema1762660000000,
      CreateCloudinaryDeletionQueue1762670000000,
      AddConversationReadState1762680000000,
      AddMessageAttachments1762690000000,
      AllowRematchesAfterBlocking1762700000000,
      CleanBlockedRelationships1762710000000,
      AddDailyDiscoveryQuota1762720000000,
      ResetLegacyDiscoveryImpressions1762730000000,
    ],
    migrationsTableName: 'typeorm_migrations',
    extra: {
      max: poolMax,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    },
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: true }
        : false,
  });

  try {
    await dataSource.initialize();
    if (shouldRevert) {
      await dataSource.undoLastMigration();
      console.info('Reverted the most recent database migration.');
    } else {
      const applied = await dataSource.runMigrations();
      console.info(
        applied.length
          ? `Applied ${applied.length} database migration(s).`
          : 'Database schema is already up to date.',
      );
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

runMigrations().catch((error: unknown) => {
  console.error('Database migration failed.', error);
  process.exitCode = 1;
});
