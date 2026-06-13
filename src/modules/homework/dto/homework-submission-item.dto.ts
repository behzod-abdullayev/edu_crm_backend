import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomeworkSubmissionItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  homeworkId: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  studentName: string;

  @ApiPropertyOptional()
  studentAvatarUrl?: string;

  @ApiPropertyOptional()
  textAnswer?: string;

  @ApiPropertyOptional({ type: [String] })
  attachedFileKeys?: string[];

  @ApiPropertyOptional()
  grade?: number;

  @ApiPropertyOptional()
  teacherFeedback?: string;

  @ApiPropertyOptional()
  submittedAt?: string;

  @ApiPropertyOptional()
  gradedAt?: string;

  @ApiProperty({ enum: ['pending', 'graded', 'late'] })
  status: 'pending' | 'graded' | 'late';
}
