import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from './auth/decorators/public.decorator.js';

@Controller('health')
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @Public()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch (error) {
      console.error('Database health check failed', error);
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
      });
    }
  }
}
