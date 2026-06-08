import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export class CreateStudentDto extends CreateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() parentName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() parentEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() enrollmentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isScholarship?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() scholarshipPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branch?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() parentName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() parentEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isScholarship?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() scholarshipPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branch?: string;
}

export class QueryStudentsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branch?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isScholarship?: boolean;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() sortOrder?: 'ASC' | 'DESC';
}
