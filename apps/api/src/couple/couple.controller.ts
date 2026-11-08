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
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '../database/entities/user.entity.js';
import { CloudinaryService } from '../storage/cloudinary.service.js';
import {
  ChallengeCreateDto,
  ChallengeUpdateDto,
  CoupleAnswerDto,
  CoupleIdQueryDto,
  DatePlanCreateDto,
  DatePlanUpdateDto,
  FeedPostCreateDto,
  FeedReactionDto,
  InvitationCreateDto,
  InvitationRespondDto,
  JournalCreateDto,
  JournalUpdateDto,
  MemoryCreateDto,
  MemoryMediaUploadDto,
  MemoryUpdateDto,
} from './dto/couple.dto.js';
import { CoupleService } from './couple.service.js';

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
};

const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

type NominatimResult = {
  address?: Record<string, unknown>;
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
  name?: unknown;
};

function mapLocation(result: NominatimResult) {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const address = result.address ?? {};
  const area = [
    address.city,
    address.town,
    address.village,
    address.county,
    address.state,
    address.country,
  ].find((value) => typeof value === 'string');
  const name =
    (typeof result.name === 'string' && result.name) ||
    (typeof result.display_name === 'string' &&
      result.display_name.split(',')[0].trim()) ||
    'Vị trí đã ghim';
  return {
    name: name.slice(0, 180),
    area: typeof area === 'string' ? area.slice(0, 180) : '',
    latitude,
    longitude,
  };
}

@Controller('couple')
export class CoupleController {
  constructor(
    private readonly couple: CoupleService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get()
  getOverview(@CurrentUser() user: User) {
    return this.couple.getOverview(user.id);
  }

  @Get('location')
  @Throttle({ default: { limit: 1, ttl: 1000 } })
  async lookupLocation(
    @Query('query') query: string | undefined,
    @Query('lat') latitude: string | undefined,
    @Query('lon') longitude: string | undefined,
  ) {
    const searchTerm = typeof query === 'string' ? query.trim() : '';
    const hasCoordinates = latitude !== undefined || longitude !== undefined;
    if (Boolean(searchTerm) === hasCoordinates) {
      throw new BadRequestException(
        'Cung cấp từ khóa tìm kiếm hoặc cả hai tọa độ.',
      );
    }

    const endpoint = new URL(
      searchTerm
        ? 'https://nominatim.openstreetmap.org/search'
        : 'https://nominatim.openstreetmap.org/reverse',
    );
    endpoint.searchParams.set('format', 'jsonv2');
    endpoint.searchParams.set('addressdetails', '1');
    if (searchTerm) {
      if (searchTerm.length < 2 || searchTerm.length > 180) {
        throw new BadRequestException(
          'Từ khóa tìm địa điểm phải có từ 2 đến 180 ký tự.',
        );
      }
      endpoint.searchParams.set('limit', '5');
      endpoint.searchParams.set('q', searchTerm);
    } else {
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        throw new BadRequestException('Tọa độ địa điểm không hợp lệ.');
      }
      endpoint.searchParams.set('lat', String(lat));
      endpoint.searchParams.set('lon', String(lon));
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        headers: {
          'Accept-Language': 'vi',
          'User-Agent': 'DATING/1.0 couple location lookup',
        },
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
    } catch {
      throw new ServiceUnavailableException(
        'Dịch vụ tìm địa điểm hiện không khả dụng.',
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Dịch vụ tìm địa điểm hiện không khả dụng.',
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ServiceUnavailableException(
        'Dịch vụ tìm địa điểm trả về dữ liệu không hợp lệ.',
      );
    }
    if (searchTerm) {
      if (!Array.isArray(payload)) {
        throw new ServiceUnavailableException(
          'Dịch vụ tìm địa điểm trả về dữ liệu không hợp lệ.',
        );
      }
      return {
        locations: payload
          .filter(
            (item): item is NominatimResult =>
              typeof item === 'object' && item !== null,
          )
          .map(mapLocation)
          .filter((location) => location !== null),
      };
    }
    if (typeof payload !== 'object' || payload === null) {
      throw new ServiceUnavailableException(
        'Dịch vụ tìm địa điểm trả về dữ liệu không hợp lệ.',
      );
    }
    const location = mapLocation(payload as NominatimResult);
    return { location };
  }

  @Delete()
  endCouple(
    @CurrentUser() user: User,
    @Query('id', new ParseUUIDPipe()) coupleId: string,
  ) {
    return this.couple.endCouple(user.id, coupleId);
  }

  @Get('invitations')
  getInvitations(@CurrentUser() user: User) {
    return this.couple.listInvitations(user.id);
  }

  @Post('invitations')
  @HttpCode(202)
  async createInvitation(
    @CurrentUser() user: User,
    @Body() input: InvitationCreateDto,
  ) {
    if (!input.targetUserId && !input.identifier?.trim()) {
      throw new BadRequestException('Hãy nhập email hoặc tên tài khoản.');
    }
    const { statusCode: _statusCode, ...result } =
      await this.couple.createInvitation(user.id, input);
    return result;
  }

  @Delete('invitations/:id')
  cancelInvitation(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.couple.cancelInvitation(user.id, invitationId);
  }

  @Post('invitations/:id/respond')
  respondInvitation(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) invitationId: string,
    @Body() input: InvitationRespondDto,
  ) {
    return this.couple.respondInvitation(user.id, invitationId, input.accept);
  }

  @Get('questions')
  getQuestion(
    @CurrentUser() user: User,
    @Query() query: CoupleIdQueryDto,
  ) {
    return this.couple.getQuestion(user.id, query.coupleId);
  }

  @Post('answers')
  submitAnswer(@CurrentUser() user: User, @Body() input: CoupleAnswerDto) {
    return this.couple.submitAnswer(user.id, input.sessionId, input.answer);
  }

  @Get('challenges')
  getChallenges(
    @CurrentUser() user: User,
    @Query() query: CoupleIdQueryDto,
  ) {
    return this.couple.listChallenges(user.id, query.coupleId);
  }

  @Post('challenges')
  startChallenge(
    @CurrentUser() user: User,
    @Body() input: ChallengeCreateDto,
  ) {
    return this.couple.startChallenge(user.id, input);
  }

  @Patch('challenges')
  updateChallenge(
    @CurrentUser() user: User,
    @Body() input: ChallengeUpdateDto,
  ) {
    return this.couple.updateChallenge(user.id, input.id, input.status);
  }

  @Get('date-plans')
  getDatePlans(
    @CurrentUser() user: User,
    @Query() query: CoupleIdQueryDto,
  ) {
    return this.couple.listDatePlans(user.id, query.coupleId);
  }

  @Post('date-plans')
  createDatePlan(
    @CurrentUser() user: User,
    @Body() input: DatePlanCreateDto,
  ) {
    return this.couple.createDatePlan(user.id, input);
  }

  @Patch('date-plans/:id')
  updateDatePlan(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: DatePlanUpdateDto,
  ) {
    return this.couple.updateDatePlan(user.id, id, input);
  }

  @Delete('date-plans/:id')
  deleteDatePlan(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.couple.deleteDatePlan(user.id, id);
  }

  @Get('journal')
  getJournal(
    @CurrentUser() user: User,
    @Query() query: CoupleIdQueryDto,
  ) {
    return this.couple.listJournal(user.id, query.coupleId);
  }

  @Post('journal')
  createJournal(
    @CurrentUser() user: User,
    @Body() input: JournalCreateDto,
  ) {
    return this.couple.createJournal(user.id, input);
  }

  @Patch('journal/:id')
  updateJournal(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: JournalUpdateDto,
  ) {
    return this.couple.updateJournal(user.id, id, input);
  }

  @Delete('journal/:id')
  deleteJournal(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.couple.deleteJournal(user.id, id);
  }

  @Get('memories')
  getMemories(
    @CurrentUser() user: User,
    @Query() query: CoupleIdQueryDto,
  ) {
    return this.couple.listMemories(user.id, query.coupleId);
  }

  @Post('memories')
  createMemory(
    @CurrentUser() user: User,
    @Body() input: MemoryCreateDto,
  ) {
    return this.couple.createMemory(user.id, input);
  }

  @Patch('memories/:id')
  updateMemory(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: MemoryUpdateDto,
  ) {
    return this.couple.updateMemory(user.id, id, input);
  }

  @Delete('memories/:id')
  deleteMemory(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.couple.deleteMemory(user.id, id);
  }

  @Get('memories/:id/media')
  getMemoryMedia(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) memoryId: string,
  ) {
    return this.couple.listMemoryMedia(user.id, memoryId);
  }

  @Post('memories/:id/media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async addMemoryMedia(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) memoryId: string,
    @Body() input: MemoryMediaUploadDto,
    @UploadedFile() file?: UploadedImage,
  ) {
    this.assertValidImage(file);
    const upload = await this.cloudinary.uploadImage(
      file.buffer,
      'dating/couples/memories',
    );
    return this.couple.addMemoryMedia(user.id, memoryId, {
      ...upload,
      role: input.role,
      sortOrder: input.sortOrder,
    });
  }

  @Delete('memories/:id/media/:mediaId')
  deleteMemoryMedia(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) memoryId: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
  ) {
    return this.couple.deleteMemoryMedia(user.id, memoryId, mediaId);
  }

  @Get('feed')
  getFeed(
    @CurrentUser() user: User,
    @Query() query: CoupleIdQueryDto,
  ) {
    return this.couple.listFeed(user.id, query.coupleId);
  }

  @Post('feed')
  createFeedPost(
    @CurrentUser() user: User,
    @Body() input: FeedPostCreateDto,
  ) {
    return this.couple.createFeedPost(user.id, input);
  }

  @Delete('feed/:id')
  deleteFeedPost(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.couple.deleteFeedPost(user.id, id);
  }

  @Post('feed/:id/media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async addFeedMedia(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @UploadedFile() file?: UploadedImage,
  ) {
    this.assertValidImage(file);
    await this.couple.assertCanAddFeedMedia(user.id, postId);
    const upload = await this.cloudinary.uploadImage(
      file.buffer,
      'dating/couples/feed',
    );
    return this.couple.addFeedMedia(
      user.id,
      postId,
      upload.secureUrl,
      upload.publicId,
    );
  }

  @Post('feed/:id/notify')
  @HttpCode(200)
  notifyFeedPost(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    return this.couple.notifyFeedPost(user.id, postId);
  }

  @Post('feed/:id/reactions')
  setReaction(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Body() input: FeedReactionDto,
  ) {
    return this.couple.setReaction(
      user.id,
      postId,
      input.coupleId,
      input.reaction,
    );
  }

  @Delete('feed/:id/reactions')
  removeReaction(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    return this.couple.removeReaction(user.id, postId);
  }

  private assertValidImage(file?: UploadedImage): asserts file is UploadedImage {
    if (!file) throw new BadRequestException('Hãy chọn ảnh để tải lên.');
    if (!imageMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Ảnh chỉ hỗ trợ định dạng JPG, PNG, WEBP hoặc GIF.');
    }
    if (file.buffer.length === 0) {
      throw new BadRequestException('Tệp ảnh không hợp lệ.');
    }
  }
}
