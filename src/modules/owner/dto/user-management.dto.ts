import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from '../../../shared/enums';

// FIX: sortBy/order qo'shildi.
// Avval: frontend useOwnerUsers har doim ?sortBy=createdAt&order=DESC yuborardi,
// lekin bu DTO da bunday fieldlar yo'q edi va main.ts da
// ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }) ishlatilgani uchun
// GET /owner/users har doim 400 Bad Request qaytarardi → Owner > Users sahifasi
// hech qachon ochilmasdi (doimiy error banner).
export class UserManagementFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: UserRole }) @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() branch?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] }) @IsOptional() @IsIn(['ASC', 'DESC']) order?: 'ASC' | 'DESC';
}

export class UserManagementResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  branch: string;
}
