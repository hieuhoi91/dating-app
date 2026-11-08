import { Module } from '@nestjs/common';
import { CoupleController } from './couple.controller.js';
import { CoupleService } from './couple.service.js';

@Module({
  controllers: [CoupleController],
  providers: [CoupleService],
  exports: [CoupleService],
})
export class CoupleModule {}
