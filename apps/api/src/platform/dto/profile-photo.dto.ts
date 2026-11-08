import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ProfilePhotoUploadDto {
  @IsOptional()
  @IsIn(['avatar', 'cover'])
  role?: 'avatar' | 'cover';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(5)
  sortOrder = 0;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  primary = false;
}
