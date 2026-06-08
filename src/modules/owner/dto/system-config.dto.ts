import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

export class SystemConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultLanguage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() featureFlags?: Record<string, boolean>;
}

export class FeatureFlagUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsObject() featureFlags: Record<string, boolean>;
}
