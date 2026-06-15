import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsNumber, IsArray, IsBoolean, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamQuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ type: [Object], description: 'Answer options (objects with id, text, isCorrect)' })
  @IsArray()
  options: Array<{ id: string; text: string; isCorrect: boolean }>;

  @ApiProperty({ nullable: true, description: 'Correct answer text for short_answer/fill_blank types' })
  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  marks?: number;

  @ApiProperty({ required: false, description: 'Sort order of question' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateExamDto {
  @ApiProperty({ description: 'Exam title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Teacher ID' })
  @IsUUID()
  teacherId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Course ID', required: false })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({ description: 'Group ID', required: false })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiProperty({ required: false, description: 'Exam start datetime (ISO string)' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiProperty({ required: false, description: 'Exam end datetime (ISO string)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiProperty({ required: false, description: 'Duration in minutes', default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiProperty({ required: false, description: 'Total marks', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalMarks?: number;

  @ApiProperty({ required: false, description: 'Passing marks', default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  passingMarks?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isRandomized?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAttempts?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ type: [CreateExamQuestionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamQuestionDto)
  questions?: CreateExamQuestionDto[];
}

export class UpdateExamDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalMarks?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  passingMarks?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isRandomized?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  instructions?: string;
}
