import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class FinancialPeriodDto {
  @ApiPropertyOptional({ enum: ['month', 'quarter', 'year'] })
  @IsOptional()
  @IsString()
  @IsIn(['month', 'quarter', 'year'])
  period?: string;
}

export class RevenueDto {
  date: string;
  amount: number;
  count: number;
}
