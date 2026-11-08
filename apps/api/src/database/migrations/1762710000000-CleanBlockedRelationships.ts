import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanBlockedRelationships1762710000000
  implements MigrationInterface
{
  name = 'CleanBlockedRelationships1762710000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "matches" m
      SET "status" = 'ended', "ended_at" = COALESCE("ended_at", now())
      WHERE m."status" = 'active'
        AND EXISTS (
          SELECT 1 FROM "blocks" b
          WHERE (b."blocker_id" = m."user_low_id" AND b."blocked_id" = m."user_high_id")
             OR (b."blocker_id" = m."user_high_id" AND b."blocked_id" = m."user_low_id")
        )
    `);
    await queryRunner.query(`
      UPDATE "conversations" c
      SET "status" = 'archived'
      FROM "matches" m
      WHERE c."match_id" = m."id" AND c."status" = 'active'
        AND EXISTS (
          SELECT 1 FROM "blocks" b
          WHERE (b."blocker_id" = m."user_low_id" AND b."blocked_id" = m."user_high_id")
             OR (b."blocker_id" = m."user_high_id" AND b."blocked_id" = m."user_low_id")
        )
    `);
    await queryRunner.query(`
      DELETE FROM "likes" l
      WHERE EXISTS (
        SELECT 1 FROM "blocks" b
        WHERE (b."blocker_id" = l."from_user_id" AND b."blocked_id" = l."to_user_id")
           OR (b."blocker_id" = l."to_user_id" AND b."blocked_id" = l."from_user_id")
      )
    `);
    await queryRunner.query(`
      UPDATE "couple_invitations" i
      SET "status" = 'cancelled', "responded_at" = now()
      WHERE i."status" = 'pending'
        AND EXISTS (
          SELECT 1 FROM "blocks" b
          WHERE (b."blocker_id" = i."sender_id" AND b."blocked_id" = i."receiver_id")
             OR (b."blocker_id" = i."receiver_id" AND b."blocked_id" = i."sender_id")
        )
    `);
    await queryRunner.query(`
      WITH ended AS (
        UPDATE "couples" c
        SET "status" = 'ended', "ended_at" = now()
        WHERE c."status" = 'active'
          AND EXISTS (
            SELECT 1
            FROM "couple_members" first_member
            JOIN "couple_members" second_member
              ON second_member."couple_id" = first_member."couple_id"
            JOIN "blocks" b
              ON (b."blocker_id" = first_member."user_id"
                  AND b."blocked_id" = second_member."user_id")
              OR (b."blocker_id" = second_member."user_id"
                  AND b."blocked_id" = first_member."user_id")
            WHERE first_member."couple_id" = c."id"
              AND first_member."left_at" IS NULL
              AND second_member."left_at" IS NULL
              AND first_member."user_id" <> second_member."user_id"
          )
        RETURNING c."id"
      )
      UPDATE "couple_members" cm
      SET "left_at" = now()
      WHERE cm."couple_id" IN (SELECT "id" FROM ended)
        AND cm."left_at" IS NULL
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'Blocked relationship cleanup is irreversible; prior likes and invitations cannot be restored.',
    );
  }
}
