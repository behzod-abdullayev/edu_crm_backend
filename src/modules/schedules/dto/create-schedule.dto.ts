import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsOptional, IsEnum } from 'class-validator';

export enum ScheduleType { REGULAR = 'regular', MAKEUP = 'makeup', EXAM = 'exam', EVENT = 'event' }
export enum ScheduleStatus { SCHEDULED = 'scheduled', COMPLETED = 'completed', CANCELLED = 'cancelled', POSTPONED = 'postponed' }

export class CreateScheduleDto {
  @ApiProperty() @IsUUID() groupId: string;
  @ApiProperty() @IsUUID() teacherId: string;
  @ApiProperty() @IsUUID() courseId: string;
  @ApiProperty({ example: '2024-03-15' }) @IsDateString() date: string;
  @ApiProperty({ example: '09:00' }) @IsString() startTime: string;
  @ApiProperty({ example: '10:30' }) @IsString() endTime: string;
  @ApiPropertyOptional() @IsOptional() @IsString() classroom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() onlineLink?: string;
  @ApiPropertyOptional({ enum: ScheduleType }) @IsOptional() @IsEnum(ScheduleType) type?: ScheduleType;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
}
