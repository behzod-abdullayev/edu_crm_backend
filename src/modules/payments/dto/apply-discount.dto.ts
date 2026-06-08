import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

export class ApplyDiscountDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsUUID() paymentId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;
}

export class CreateDiscountDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: ['percentage', 'fixed'] }) type: 'percentage' | 'fixed';
  @ApiProperty() value: number;
  @ApiProperty() validFrom: string;
  @ApiPropertyOptional() validUntil?: string;
  @ApiPropertyOptional() maxUses?: number;
}
