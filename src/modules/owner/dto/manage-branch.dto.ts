import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ManageBranchDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMain?: boolean;
  // managerId - filial menejeri (frontend BranchForm dan keladi)
  @ApiPropertyOptional() @IsOptional() @IsString() managerId?: string | null;
}

export class BranchDto {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  managerId?: string | null;
}