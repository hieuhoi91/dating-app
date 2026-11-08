import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const genders = ['Nữ', 'Nam', 'Khác', 'Không muốn chia sẻ'];

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]{3,30}$/)
  username?: string;

  @IsOptional()
  @IsIn(genders)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  coarseLocation?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  dateOfBirth?: string | null;

  @IsOptional()
  @IsLatitude()
  latitude?: number | null;

  @IsOptional()
  @IsLongitude()
  longitude?: number | null;
}
