import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';

export class QueryNotificationsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
