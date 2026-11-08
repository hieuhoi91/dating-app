import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '../database/entities/user.entity.js';
import { NotificationReadDto } from './dto/notification-read.dto.js';
import { ProfilePhotoUploadDto } from './dto/profile-photo.dto.js';
import { PlatformService } from './platform.service.js';

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
};

@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('notifications')
  getNotifications(@CurrentUser() user: User) {
    return this.platform.getNotifications(user.id);
  }

  @Patch('notifications')
  setNotificationRead(
    @CurrentUser() user: User,
    @Body() body: NotificationReadDto,
  ) {
    return this.platform.setNotificationRead(user.id, body.id, body.read);
  }

  @Patch('notifications/read-all')
  markAllNotificationsRead(@CurrentUser() user: User) {
    return this.platform.markAllNotificationsRead(user.id);
  }

  @Get('subscriptions')
  getSubscriptions(@CurrentUser() user: User) {
    return this.platform.getSubscriptions(user.id);
  }

  @Get('verification')
  getVerifications(@CurrentUser() user: User) {
    return this.platform.getVerifications(user.id);
  }

  @Get('relationship-events')
  getRelationshipEvents(@CurrentUser() user: User) {
    return this.platform.getRelationshipEvents(user.id);
  }

  @Get('profile/photos')
  getProfilePhotos(@CurrentUser() user: User) {
    return this.platform.getProfilePhotos(user.id);
  }

  @Post('profile/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadProfilePhoto(
    @CurrentUser() user: User,
    @UploadedFile() file: UploadedImage | undefined,
    @Body() body: ProfilePhotoUploadDto,
  ) {
    if (!file) throw new BadRequestException('Hãy chọn ảnh hồ sơ để tải lên.');
    return this.platform.uploadProfilePhoto(user.id, file, body);
  }

  @Delete('profile/photos/:id')
  deleteProfilePhoto(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.platform.deleteProfilePhoto(user.id, id);
  }
}
