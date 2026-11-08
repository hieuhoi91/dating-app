import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class InvitationCreateDto {
  @IsOptional()
  @IsString()
  @MaxLength(254)
  identifier?: string;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}

export class InvitationRespondDto {
  @IsBoolean()
  accept!: boolean;
}

export class CoupleAnswerDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  answer!: string;
}

export class CoupleIdQueryDto {
  @IsUUID()
  coupleId!: string;
}

export class ChallengeCreateDto {
  @IsUUID()
  coupleId!: string;

  @IsUUID()
  challengeId!: string;

  @IsIn(['in_progress', 'completed', 'skipped'])
  status!: string;
}

export class ChallengeUpdateDto {
  @IsUUID()
  id!: string;

  @IsIn(['in_progress', 'completed', 'skipped'])
  status!: string;
}

export class DatePlanCreateDto {
  @IsUUID()
  coupleId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsISO8601()
  startsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;
}

export class DatePlanUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsISO8601()
  starts_at?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;

  @IsOptional()
  @IsIn(['active', 'archived', 'deleted'])
  status?: string;
}

export class JournalCreateDto {
  @IsUUID()
  coupleId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  entryDate?: string;
}

export class JournalUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  entry_date?: string;
}

export class MemoryCreateDto {
  @IsUUID()
  coupleId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  memoryDate?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  locationArea?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLatitude?: number | null;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLongitude?: number | null;
}

export class MemoryUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  memory_date?: string;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  location_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  location_area?: string;
}

export class MemoryMediaUploadDto {
  @IsIn(['thumbnail', 'gallery'])
  role!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  sortOrder = 0;
}

export class FeedPostCreateDto {
  @IsUUID()
  coupleId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  locationArea?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLatitude?: number | null;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLongitude?: number | null;
}

export class FeedReactionDto {
  @IsUUID()
  coupleId!: string;

  @IsIn(['heart', 'love', 'laugh', 'wow'])
  reaction!: string;
}
