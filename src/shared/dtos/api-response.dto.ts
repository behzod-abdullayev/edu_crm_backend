import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty() success: boolean;
  @ApiPropertyOptional() data?: T;
  @ApiProperty() timestamp: string;
  @ApiPropertyOptional() requestId?: string;
}

export class PaginatedMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNext: boolean;
  @ApiProperty() hasPrev: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ type: () => Array }) data: T[];
  @ApiProperty({ type: PaginatedMetaDto }) meta: PaginatedMetaDto;
}
