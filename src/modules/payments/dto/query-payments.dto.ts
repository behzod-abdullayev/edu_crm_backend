import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { PaymentStatus } from '../../../shared/enums';

export class QueryPaymentsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() studentId?: string;
  @ApiPropertyOptional({ enum: PaymentStatus }) @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional() @IsOptional() from?: string;
  @ApiPropertyOptional() @IsOptional() to?: string;
}
