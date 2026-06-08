import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class OwnerCreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'Content Manager' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [String], description: 'List of permission strings' })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
