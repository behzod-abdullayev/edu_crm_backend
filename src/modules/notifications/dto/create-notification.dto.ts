import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { NotificationChannel } from '../../../shared/enums';

export class CreateNotificationDto {
  @ApiProperty() @IsUUID() userId: string;
  @ApiProperty() @IsString() type: string;
  @ApiProperty({ enum: NotificationChannel }) @IsEnum(NotificationChannel) channel: NotificationChannel;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() data?: Record<string, any>;
}
