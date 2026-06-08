import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsInt, IsBoolean, IsDateString, Min, Max } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsUUID() courseId: string;
  @ApiProperty() @IsUUID() teacherId: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) maxStudents?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() branch?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() scheduleTemplate?: any[];
}
