import { ApiProperty } from '@nestjs/swagger';

export class ExamQuestionOptionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  text: string;
}

export class ExamQuestionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  examId: string;

  @ApiProperty()
  question: string;

  @ApiProperty({ enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'] })
  type: string;

  @ApiProperty({ type: () => [ExamQuestionOptionDto] })
  options: ExamQuestionOptionDto[];

  @ApiProperty()
  marks: number;

  @ApiProperty({ nullable: true })
  explanation: string | null;

  @ApiProperty()
  sortOrder: number;
}

export class ExamResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: ['quiz', 'midterm', 'final', 'practice'] })
  type: string;

  @ApiProperty({ nullable: true })
  courseId: string | null;

  @ApiProperty({ nullable: true })
  groupId: string | null;

  @ApiProperty()
  teacherId: string;

  @ApiProperty({ nullable: true })
  startAt: string | null;

  @ApiProperty({ nullable: true })
  endAt: string | null;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  totalMarks: number;

  @ApiProperty()
  passingMarks: number;

  @ApiProperty()
  isRandomized: boolean;

  @ApiProperty()
  showResultImmediately: boolean;

  @ApiProperty()
  maxAttempts: number;

  @ApiProperty()
  isPublished: boolean;

  @ApiProperty({ nullable: true })
  instructions: string | null;

  @ApiProperty({ type: () => [ExamQuestionResponseDto] })
  questions: ExamQuestionResponseDto[];

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ExamAttemptResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  examId: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  startedAt: string;

  @ApiProperty({ nullable: true })
  submittedAt: string | null;

  @ApiProperty({ nullable: true })
  score: number | null;

  @ApiProperty({ nullable: true })
  isPassed: boolean | null;

  @ApiProperty()
  attemptNumber: number;

  @ApiProperty({ nullable: true })
  timeTakenMinutes: number | null;

  @ApiProperty()
  createdAt: string;
}
