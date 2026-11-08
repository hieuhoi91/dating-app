import { IsBoolean, IsUUID } from 'class-validator';

export class NotificationReadDto {
  @IsUUID()
  id!: string;

  @IsBoolean()
  read!: boolean;
}
