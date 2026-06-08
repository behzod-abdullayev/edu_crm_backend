import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsHexColor, IsUrl, Length, IsEnum } from 'class-validator';
import { Language } from '../../../shared/enums';

export class TenantConfigDto {
  @ApiPropertyOptional({ example: 'Asia/Tashkent' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  defaultLanguage?: Language;

  @ApiPropertyOptional({ example: 'UZS', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: '#3498db' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#2ecc71' })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
