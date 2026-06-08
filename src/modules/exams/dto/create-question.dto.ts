import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsArray, IsInt, Min } from 'class-validator';
import { QuestionType } from '../../../shared/enums';

export class CreateQuestionDto {
  @ApiProperty() @IsString() text: string;
  @ApiProperty({ enum: QuestionType }) @IsEnum(QuestionType) type: QuestionType;
  @ApiPropertyOptional({ description: 'For multiple choice: [{id, text, isCorrect}]' })
  @IsOptional() @IsArray() options?: any[];
  @ApiPropertyOptional() @IsOptional() @IsString() correctAnswer?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsNumber() @Min(0) points?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;
}
