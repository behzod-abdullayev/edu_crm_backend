import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min, IsObject } from 'class-validator';

export enum ScheduleType { REGULAR = 'regular', MAKEUP = 'makeup', EXAM = 'exam', EVENT = 'event' }
export enum ScheduleStatus { SCHEDULED = 'scheduled', COMPLETED = 'completed', CANCELLED = 'cancelled', POSTPONED = 'postponed' }
export enum RepeatRule { DAILY = 'daily', WEEKLY = 'weekly', BIWEEKLY = 'biweekly', MONTHLY = 'monthly', ODD_DAYS = 'odd-days', EVEN_DAYS = 'even-days' }

export class CreateScheduleDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiProperty() @IsUUID() teacherId: string;
  @ApiProperty() @IsUUID() courseId: string;
  @ApiProperty({ example: '2024-03-15' }) @IsDateString() date: string;
  @ApiProperty({ example: '09:00' }) @IsString() startTime: string;
  @ApiProperty({ example: '10:30' }) @IsString() endTime: string;
  @ApiPropertyOptional() @IsOptional() @IsString() classroom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() onlineLink?: string;
  @ApiPropertyOptional({ enum: ScheduleType }) @IsOptional() @IsEnum(ScheduleType) type?: ScheduleType;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRecurring?: boolean;
  @ApiPropertyOptional({ enum: RepeatRule }) @IsOptional() @IsEnum(RepeatRule) repeatRule?: RepeatRule;
  @ApiPropertyOptional() @IsOptional() @IsDateString() courseEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalLessons?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
