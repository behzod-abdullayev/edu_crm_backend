import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsNumber, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHomeworkDto {
  @ApiProperty({ description: 'Homework title', example: 'Chapter 5 Exercises' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false, description: 'Detailed instructions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Group ID this homework is assigned to' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ description: 'Lesson ID this homework belongs to', required: false })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiProperty({ required: false, description: 'Due date (ISO string)', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false, description: 'Maximum score for this homework', minimum: 1, maximum: 1000, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxScore?: number;
}
