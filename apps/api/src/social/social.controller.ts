import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '../database/entities/user.entity.js';
import {
  BlockDto,
  DiscoveryQueryDto,
  LikeDto,
  MessagesQueryDto,
  PreferencesPatchDto,
  ReportDto,
  SettingsPatchDto,
} from './dto/social.dto.js';
import { SocialService } from './social.service.js';

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
};

@Controller('api')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get('preferences')
  getPreferences(@CurrentUser() user: User) {
    return this.social.getPreferences(user.id);
  }

  @Patch('preferences')
  patchPreferences(
    @CurrentUser() user: User,
    @Body() input: PreferencesPatchDto,
  ) {
    return this.social.patchPreferences(user.id, input);
  }

  @Get('settings')
  getSettings(@CurrentUser() user: User) {
    return this.social.getSettings(user.id);
  }

  @Patch('settings')
  patchSettings(
    @CurrentUser() user: User,
    @Body() input: SettingsPatchDto,
  ) {
    return this.social.patchSettings(user.id, input);
  }

  @Get('blocks')
  getBlocks(@CurrentUser() user: User) {
    return this.social.getBlocks(user.id);
  }

  @Post('blocks')
  addBlock(@CurrentUser() user: User, @Body() input: BlockDto) {
    return this.social.addBlock(user.id, input);
  }

  @Delete('blocks')
  removeBlock(@CurrentUser() user: User, @Body() input: BlockDto) {
    return this.social.removeBlock(user.id, input);
  }

  @Post('reports')
  createReport(@CurrentUser() user: User, @Body() input: ReportDto) {
    return this.social.createReport(user.id, input);
  }

  @Get('discovery')
  getDiscovery(
    @CurrentUser() user: User,
    @Query() query: DiscoveryQueryDto,
  ) {
    return this.social.getDiscovery(user.id, query);
  }

  @Get('likes')
  getLikes(@CurrentUser() user: User) {
    return this.social.getLikes(user.id);
  }

  @Post('likes')
  @HttpCode(200)
  submitLike(@CurrentUser() user: User, @Body() input: LikeDto) {
    return this.social.submitLike(user.id, input);
  }

  @Get('matches')
  getMatches(@CurrentUser() user: User) {
    return this.social.getMatches(user.id);
  }

  @Delete('matches/:id')
  endMatch(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) matchId: string,
  ) {
    return this.social.endMatch(user.id, matchId);
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: User) {
    return this.social.getConversations(user.id);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.social.getMessages(user.id, conversationId, query.before);
  }

  @Post('conversations/:id/messages')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'files', maxCount: 5 },
        { name: 'file', maxCount: 1 },
      ],
      {
        limits: { fileSize: 8 * 1024 * 1024, files: 5 },
      },
    ),
  )
  createMessage(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Body('content') content: unknown,
    @UploadedFiles()
    uploaded?: { files?: UploadedImage[]; file?: UploadedImage[] },
  ) {
    if (content !== undefined && typeof content !== 'string') {
      throw new BadRequestException('Nội dung tin nhắn chưa hợp lệ.');
    }
    if (content !== undefined && content.length > 5000) {
      throw new BadRequestException('Tin nhắn không được dài quá 5000 ký tự.');
    }
    return this.social.createMessage(user.id, conversationId, {
      content: content ?? '',
      files: [...(uploaded?.files ?? []), ...(uploaded?.file ?? [])],
    });
  }
}
