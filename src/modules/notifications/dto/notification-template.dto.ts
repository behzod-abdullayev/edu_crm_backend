import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateNotificationTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() key: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() emailSubject?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() emailBody?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() smsBody?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() inAppTitle?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() inAppBody?: string;
}

export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() emailSubject?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() emailBody?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() smsBody?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() inAppTitle?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() inAppBody?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}
