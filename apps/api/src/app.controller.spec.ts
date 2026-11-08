import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  let appController: AppController;
  const query = vi.fn();

  beforeEach(async () => {
    query.mockReset().mockResolvedValue([{ '?column?': 1 }]);
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: DataSource, useValue: { query } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('health check', () => {
    it('confirms the PostgreSQL connection', async () => {
      await expect(appController.check()).resolves.toEqual({
        status: 'ok',
        database: 'ok',
      });
      expect(query).toHaveBeenCalledWith('SELECT 1');
    });

    it('reports database failures as unavailable', async () => {
      query.mockRejectedValueOnce(new Error('database unavailable'));
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(appController.check()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );

      expect(errorLog).toHaveBeenCalledOnce();
    });
  });
});
