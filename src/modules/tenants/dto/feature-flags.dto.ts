import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class FeatureFlagsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() chatEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() examEngine?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() certificateGeneration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() analyticsAdvanced?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() multiCurrency?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smsNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() apiAccess?: boolean;
}
