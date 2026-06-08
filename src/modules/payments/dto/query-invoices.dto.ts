import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';

export class QueryInvoicesDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter invoices by student ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by invoice status',
    example: 'paid',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
