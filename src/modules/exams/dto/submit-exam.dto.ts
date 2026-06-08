import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExamAnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsUUID()
  questionId: string;

  @ApiProperty({ description: 'Answer: option id for MC/TF, text for short_answer/fill_blank' })
  @IsString()
  answer: string;
}

export class SubmitExamDto {
  @ApiProperty({ type: () => [ExamAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerDto)
  answers: ExamAnswerDto[];
}
