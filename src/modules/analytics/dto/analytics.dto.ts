import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class DateRangeDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}

export class AnalyticsFilterDto extends DateRangeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() teacherId?: string;
}

export class OverviewDto {
  @ApiProperty() totalStudents: number;
  @ApiProperty() totalTeachers: number;
  @ApiProperty() monthlyRevenue: number;
  @ApiProperty() attendanceRate: number;
}
