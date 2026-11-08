import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

function IsBooleanRecord(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isBooleanRecord',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            Object.values(value).every((item) => typeof item === 'boolean')
          );
        },
      },
    });
  };
}

export class PreferencesPatchDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interested_in?: string[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(18)
  @Max(99)
  age_min?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(18)
  @Max(99)
  age_max?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(500)
  max_distance_km?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interests?: string[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  discovery_enabled?: boolean;
}

export class SettingsPatchDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['discoverable', 'hidden'])
  profile_visibility?: 'discoverable' | 'hidden';

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  push_enabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  email_enabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @IsBooleanRecord()
  privacy_preferences?: Record<string, boolean>;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @IsBooleanRecord()
  notification_preferences?: Record<string, boolean>;
}

export class BlockDto {
  @IsUUID()
  blockedUserId!: string;
}

export class ReportDto {
  @IsUUID()
  reportedUserId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  reason!: string;

  @IsString()
  @MaxLength(4000)
  description = '';
}

export class LikeDto {
  @IsUUID()
  targetUserId!: string;

  @IsIn(['like', 'pass'])
  action!: 'like' | 'pass';
}

export class DiscoveryQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(99)
  age_min?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(99)
  age_max?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['Nữ', 'Nam', 'Khác', 'Không muốn chia sẻ'])
  gender?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  max_distance_km?: number;
}

export class DiscoveryViewDto {
  @IsUUID()
  targetUserId!: string;
}

export class MessagesQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  before?: string;
}

export class MessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}
