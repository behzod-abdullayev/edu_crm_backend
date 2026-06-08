import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus } from '../../../shared/enums';

export class EnrolledCourseResponseDto {
  @ApiProperty({ description: 'Course unique ID' })
  courseId: string;

  @ApiProperty({ description: 'Course title' })
  courseTitle: string;

  @ApiPropertyOptional({ description: 'Course cover image URL', nullable: true })
  coverImageUrl: string | null;

  @ApiProperty({ description: 'Completion progress percentage 0-100', example: 45 })
  progressPercent: number;

  @ApiProperty({ description: 'Number of lessons completed', example: 9 })
  completedLessons: number;

  @ApiProperty({ description: 'Total number of lessons in the course', example: 20 })
  totalLessons: number;

  @ApiProperty({
    enum: CourseStatus,
    description: 'Current course status',
    example: CourseStatus.PUBLISHED,
  })
  status: CourseStatus;

  @ApiProperty({ description: 'Enrollment date' })
  enrolledAt: Date;

  @ApiPropertyOptional({ description: 'Teacher full name', nullable: true })
  teacherName: string | null;
}
