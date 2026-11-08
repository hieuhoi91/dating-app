import { CloudinaryDeletionService } from './cloudinary-deletion.service.js';

describe('CloudinaryDeletionService retry scheduling', () => {
  it('uses a bounded integer interval after a Cloudinary deletion failure', async () => {
    const queries: Array<{ sql: string; parameters: unknown[] }> = [];
    const dataSource = {
      isInitialized: true,
      query: vi.fn(async (sql: string, parameters: unknown[] = []) => {
        if (sql.includes('WITH pending AS')) {
          return [{ id: 'job-id', public_id: 'image-id', attempts: 8 }];
        }
        queries.push({ sql, parameters });
        return [];
      }),
    };
    const cloudinary = {
      deleteImage: vi.fn().mockRejectedValue(new Error('Cloudinary unavailable')),
    };
    const service = new CloudinaryDeletionService(
      dataSource as never,
      cloudinary as never,
    );

    await (
      service as unknown as { processPending: () => Promise<void> }
    ).processPending();

    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toContain(
      "now() + ($2::integer * interval '1 second')",
    );
    expect(queries[0].parameters).toEqual([
      'job-id',
      3600,
      'Cloudinary unavailable',
    ]);
  });
});
