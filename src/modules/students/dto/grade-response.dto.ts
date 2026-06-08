import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeResponseDto {
  @ApiProperty({ description: 'Grade record unique ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Student user ID', format: 'uuid' })
  studentId: string;

  @ApiProperty({ description: 'Related homework assignment ID', format: 'uuid' })
  homeworkId: string;

  @ApiPropertyOptional({
    description: 'Title of the homework assignment',
    nullable: true,
    example: 'Chapter 3 Exercises',
  })
  homeworkTitle: string | null;

  @ApiPropertyOptional({
    description: 'Course title for context',
    nullable: true,
    example: 'English for Beginners',
  })
  courseTitle: string | null;

  @ApiProperty({ description: 'Points received', example: 85 })
  score: number;

  @ApiProperty({ description: 'Maximum possible points', example: 100 })
  maxScore: number;

  @ApiProperty({
    description: 'Percentage score calculated as (score/maxScore)*100',
    example: 85.0,
  })
  percentage: number;

  @ApiPropertyOptional({
    description: 'Teacher feedback text',
    nullable: true,
    example: 'Good work, but check grammar in section 2.',
  })
  feedback: string | null;

  @ApiProperty({ description: 'When the homework was graded' })
  gradedAt: Date;

  @ApiPropertyOptional({
    description: 'Full name of the teacher who graded',
    nullable: true,
    example: 'John Smith',
  })
  gradedByName: string | null;

  @ApiPropertyOptional({
    description: 'Name of the teacher who graded (legacy field)',
    nullable: true,
    example: 'John Smith',
  })
  teacherName: string | null;

  @ApiPropertyOptional({
    description: 'Due date of the homework assignment',
    nullable: true,
    example: '2024-03-20',
  })
  dueDate: string | null;

  @ApiProperty({
    description: 'Submission status',
    enum: ['submitted', 'graded', 'pending'],
    example: 'graded',
  })
  status: 'submitted' | 'graded' | 'pending';
}
