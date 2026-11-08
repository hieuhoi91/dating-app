import { Global, Module } from '@nestjs/common';
import { CloudinaryDeletionService } from './cloudinary-deletion.service.js';
import { CloudinaryService } from './cloudinary.service.js';

@Global()
@Module({
  providers: [CloudinaryService, CloudinaryDeletionService],
  exports: [CloudinaryService, CloudinaryDeletionService],
})
export class StorageModule {}
