import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search term', minLength: 1 })
  @IsString()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({
    default: 10,
    description: 'Max results returned (per type, capped overall)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Comma-separated entity types: students,teachers,courses' })
  @IsOptional()
  @IsString()
  types?: string;
}
