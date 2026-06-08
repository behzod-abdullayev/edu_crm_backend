import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsOptional, IsArray, IsInt, Min } from 'class-validator';

export class BulkCreateScheduleDto {
  @ApiProperty() @IsUUID() groupId: string;
  @ApiProperty() @IsUUID() teacherId: string;
  @ApiProperty() @IsUUID() courseId: string;
  @ApiProperty({ example: '2024-03-01' }) @IsDateString() startDate: string;
  @ApiProperty({ example: '2024-06-01' }) @IsDateString() endDate: string;
  @ApiProperty({ example: [1, 3, 5], description: '1=Monday, 7=Sunday' })
  @IsArray() @IsInt({ each: true }) daysOfWeek: number[];
  @ApiProperty({ example: '09:00' }) @IsString() startTime: string;
  @ApiProperty({ example: '10:30' }) @IsString() endTime: string;
  @ApiPropertyOptional() @IsOptional() @IsString() classroom?: string;
}
