import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeItemDto {
  @ApiProperty({ description: 'Grade record unique ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Points received', example: 85 })
  grade: number;

  @ApiProperty({ description: 'Maximum possible points', example: 100 })
  maxGrade: number;

  @ApiPropertyOptional({ description: 'Related homework assignment ID', format: 'uuid' })
  homeworkId?: string;

  @ApiPropertyOptional({ description: 'Related exam ID', format: 'uuid' })
  examId?: string;

  @ApiPropertyOptional({ description: 'Course title for context', example: 'English for Beginners' })
  courseName?: string;

  @ApiPropertyOptional({ description: 'When the grade was given' })
  gradedAt?: string;

  @ApiPropertyOptional({ description: 'Teacher feedback text', example: 'Good work!' })
  feedback?: string;
}

export class CourseGradesSummaryDto {
  @ApiProperty({ description: 'Course unique ID', format: 'uuid' })
  courseId: string;

  @ApiProperty({ description: 'Course title', example: 'English for Beginners' })
  courseName: string;

  @ApiProperty({ description: 'Average percentage score across all grades in this course', example: 87.5 })
  averageScore: number;

  @ApiProperty({ type: [GradeItemDto] })
  grades: GradeItemDto[];
}
