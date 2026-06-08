import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsEnum, IsOptional, IsString, IsDateString, Min } from 'class-validator';
import { PaymentMethod } from '../../../shared/enums';

export class CreatePaymentDto {
  @ApiProperty() @IsUUID() studentId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiProperty({ minimum: 0 }) @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional({ default: 'UZS' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 100 }) @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 100 }) @IsOptional() @IsNumber() @Min(0) taxPercent?: number;
}
