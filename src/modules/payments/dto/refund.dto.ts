import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RefundDto {
  @ApiProperty({ minimum: 0 }) @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
