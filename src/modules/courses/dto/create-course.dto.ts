import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseStatus, LessonType } from '../../../shared/enums';

export class CreateCourseDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() durationHours?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() maxStudents?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() difficultyLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() certificateEnabled?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional({ enum: CourseStatus }) @IsOptional() @IsEnum(CourseStatus) status?: CourseStatus;
}

export class CreateLessonDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional({ enum: LessonType }) @IsOptional() @IsEnum(LessonType) type?: LessonType;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() moduleNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFree?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() durationMinutes?: number;
}

export class EnrollStudentDto {
  @ApiProperty() @IsUUID() studentId: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() discountPercent?: number;
}

export class QueryCoursesDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional({ enum: CourseStatus }) @IsOptional() @IsEnum(CourseStatus) status?: CourseStatus;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() sortOrder?: 'ASC' | 'DESC';
}