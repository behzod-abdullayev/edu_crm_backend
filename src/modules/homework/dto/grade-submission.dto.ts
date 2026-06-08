import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GradeSubmissionDto {
  @ApiProperty({ description: 'Score awarded', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  score: number;

  @ApiProperty({ required: false, description: 'Feedback for the student' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
