import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export class CreateTeacherDto extends CreateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() specialization?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() subjects?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() hireDate?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() salary?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() salaryCurrency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() maxStudents?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() qualifications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salaryType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branch?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}
