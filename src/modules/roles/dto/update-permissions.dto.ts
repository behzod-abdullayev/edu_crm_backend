import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { Permission } from '../../../shared/enums';

export class UpdatePermissionsDto {
  @ApiProperty({ enum: Permission, isArray: true })
  @IsArray() @IsEnum(Permission, { each: true })
  permissions: Permission[];
}
