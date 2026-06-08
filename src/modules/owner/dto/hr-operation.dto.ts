import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { UserRole } from '../../../shared/enums';

export class HrOperationDto {
  @ApiProperty() @IsString() userId: string;
  @ApiProperty({ enum: ['hire', 'fire', 'change_role', 'update_salary'] }) @IsString() operation: string;
  @ApiPropertyOptional({ enum: UserRole }) @IsOptional() @IsEnum(UserRole) newRole?: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  // Maosh yangilash uchun (update_salary operatsiyasi)
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) salary?: number;
}