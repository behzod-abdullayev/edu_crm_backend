import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';
import { Permission } from '../../../shared/enums';

export class CreateRoleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: Permission, isArray: true })
  @IsArray() @IsEnum(Permission, { each: true })
  permissions: Permission[];
}
