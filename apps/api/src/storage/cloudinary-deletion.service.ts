import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';
import { CloudinaryService } from './cloudinary.service.js';

type DeletionJob = {
  id: string;
  public_id: string;
  attempts: number;
};

const BATCH_SIZE = 20;
const RETRY_INTERVAL_MS = 30_000;

@Injectable()
export class CloudinaryDeletionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CloudinaryDeletionService.name);
  private retryTimer: NodeJS.Timeout | undefined;
  private processing = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cloudinary: CloudinaryService,
  ) {}

  onModuleInit(): void {
    this.retryTimer = setInterval(() => {
      void this.processPending().catch((error: unknown) => {
        this.logger.error(
          'Cloudinary deletion queue processing failed.',
          error instanceof Error ? error.stack : undefined,
        );
      });
    }, RETRY_INTERVAL_MS);
    this.retryTimer.unref();
    void this.processPending().catch((error: unknown) => {
      this.logger.error(
        'Initial Cloudinary deletion queue processing failed.',
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  onModuleDestroy(): void {
    if (this.retryTimer) clearInterval(this.retryTimer);
  }

  async enqueue(manager: EntityManager, publicIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(publicIds.filter(Boolean))];
    if (!uniqueIds.length) return;
    await manager.query(
      `INSERT INTO cloudinary_deletion_jobs (public_id)
       SELECT asset.public_id FROM unnest($1::text[]) AS asset(public_id)
       ON CONFLICT (public_id) DO NOTHING`,
      [uniqueIds],
    );
  }

  async enqueueOutsideTransaction(publicId: string): Promise<void> {
    if (!publicId) return;
    await this.dataSource.query(
      `INSERT INTO cloudinary_deletion_jobs (public_id)
       VALUES ($1) ON CONFLICT (public_id) DO NOTHING`,
      [publicId],
    );
  }

  private async processPending(): Promise<void> {
    if (this.processing || !this.dataSource.isInitialized) return;
    this.processing = true;
    try {
      const jobs = await this.dataSource.query<DeletionJob[]>(
        `WITH pending AS (
           SELECT id
           FROM cloudinary_deletion_jobs
           WHERE next_attempt_at <= now()
             AND (locked_until IS NULL OR locked_until < now())
           ORDER BY created_at
           FOR UPDATE SKIP LOCKED
           LIMIT $1
         )
         UPDATE cloudinary_deletion_jobs jobs
         SET locked_until = now() + interval '2 minutes',
             attempts = jobs.attempts + 1
         FROM pending
         WHERE jobs.id = pending.id
         RETURNING jobs.id, jobs.public_id, jobs.attempts`,
        [BATCH_SIZE],
      );
      for (const job of jobs) {
        await this.processJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processJob(job: DeletionJob): Promise<void> {
    try {
      await this.cloudinary.deleteImage(job.public_id);
      await this.dataSource.query(
        'DELETE FROM cloudinary_deletion_jobs WHERE id = $1',
        [job.id],
      );
    } catch (error) {
      const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(job.attempts - 1, 7));
      const message =
        error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error';
      await this.dataSource.query(
        `UPDATE cloudinary_deletion_jobs
         SET locked_until = NULL,
             next_attempt_at = now() + make_interval(secs => $2::double precision),
             last_error = $3
         WHERE id = $1`,
        [job.id, delaySeconds, message],
      );
      this.logger.warn(
        `Cloudinary image deletion failed; retry ${job.attempts} scheduled in ${delaySeconds}s.`,
      );
    }
  }
}
