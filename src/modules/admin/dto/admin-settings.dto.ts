import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsBoolean, IsNotEmpty, IsObject, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SettingsFeatureFlagsDto {
  @ApiProperty() @IsBoolean() payments: boolean;
  @ApiProperty() @IsBoolean() chat: boolean;
  @ApiProperty() @IsBoolean() certificates: boolean;
  @ApiProperty() @IsBoolean() exams: boolean;
}

export class TenantSettingsConfigDto {
  @ApiProperty() academyName: string;
  @ApiProperty({ type: String, nullable: true }) logoUrl: string | null;
  @ApiProperty() timezone: string;
  @ApiProperty() currency: string;
  @ApiProperty() primaryColor: string;
  @ApiProperty({ type: SettingsFeatureFlagsDto }) features: SettingsFeatureFlagsDto;
}

export class UpdateTenantSettingsDto {
  @ApiProperty() @IsString() @IsNotEmpty() academyName: string;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() logoUrl?: string | null;
  @ApiProperty() @IsString() timezone: string;
  @ApiProperty() @IsString() currency: string;
  @ApiProperty() @IsString() primaryColor: string;

  @ApiProperty({ type: SettingsFeatureFlagsDto })
  @ValidateNested()
  @Type(() => SettingsFeatureFlagsDto)
  features: SettingsFeatureFlagsDto;
}

export class PricingEntryDto {
  @ApiProperty() id: string;
  @ApiProperty() courseId: string;
  @ApiProperty() courseName: string;
  @ApiProperty() price: number;
  @ApiProperty() currency: string;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    type: Object,
    description: 'Map of notification preference keys to enabled flags',
    example: { paymentOverdue: true, weeklyReport: false },
  })
  @IsObject()
  preferences: Record<string, boolean>;
}
