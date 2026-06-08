import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum RoomType { DIRECT = 'direct', GROUP = 'group', COURSE = 'course', SUPPORT = 'support' }

export class CreateRoomDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiProperty({ enum: RoomType }) @IsEnum(RoomType) type: RoomType;
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) participantIds: string[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
}
