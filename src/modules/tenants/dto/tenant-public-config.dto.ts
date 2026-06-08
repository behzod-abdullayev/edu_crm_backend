import { ApiProperty } from '@nestjs/swagger';

export class TenantFeatureFlagsDto {
  @ApiProperty({ description: 'Whether payments module is enabled' })
  paymentsEnabled: boolean;

  @ApiProperty({ description: 'Whether chat module is enabled' })
  chatEnabled: boolean;

  @ApiProperty({ description: 'Whether certificates module is enabled' })
  certificatesEnabled: boolean;

  @ApiProperty({ description: 'Whether exam engine is enabled' })
  examEngineEnabled: boolean;

  @ApiProperty({ description: 'Whether analytics module is enabled' })
  analyticsEnabled: boolean;

  @ApiProperty({ description: 'Whether multi-currency is enabled' })
  multiCurrencyEnabled: boolean;
}

export class TenantPublicConfigDto {
  @ApiProperty({ description: 'Tenant unique identifier' })
  tenantId: string;

  @ApiProperty({ description: 'Tenant slug (subdomain identifier)' })
  slug: string;

  @ApiProperty({ description: 'Tenant display name' })
  name: string;

  @ApiProperty({ nullable: true, description: 'Logo image URL' })
  logoUrl: string | null;

  @ApiProperty({ nullable: true, description: 'Primary brand color (hex)', example: '#4F46E5' })
  primaryColor: string | null;

  @ApiProperty({ type: TenantFeatureFlagsDto, description: 'Feature flag configuration' })
  featureFlags: TenantFeatureFlagsDto;

  @ApiProperty({ description: 'Default locale', example: 'uz', enum: ['uz', 'en', 'ru'] })
  defaultLocale: string;

  @ApiProperty({ description: 'Timezone', example: 'Asia/Tashkent' })
  timezone: string;

  @ApiProperty({ description: 'Currency code', example: 'UZS' })
  currency: string;
}
