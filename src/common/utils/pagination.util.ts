import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SelectQueryBuilder } from 'typeorm';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * QueryBuilder-based paginate (original signature, preserved for compatibility)
 */
export async function paginate<T extends object>(
  queryBuilder: SelectQueryBuilder<T>,
  dto: PaginationDto,
): Promise<PaginatedResult<T>> {
  const page = dto.page ?? 1;
  const limit = dto.limit ?? 20;
  const skip = (page - 1) * limit;

  if (dto.sortBy) {
    const alias = queryBuilder.alias;
    queryBuilder.orderBy(`${alias}.${dto.sortBy}`, dto.sortOrder ?? 'DESC');
  }

  queryBuilder.skip(skip).take(limit);

  const [data, total] = await queryBuilder.getManyAndCount();
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Simple array-based paginate for already-fetched data
 */
export function paginateArray<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export function paginateCursor<T extends { id: string }>(
  data: T[],
  limit: number,
): CursorPaginatedResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const lastItem = items[items.length - 1];
  return {
    data: items,
    nextCursor: hasMore && lastItem ? lastItem.id : null,
    hasMore,
  };
}

export function getPaginationParams(query: { page?: number | string; limit?: number | string }): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
}
