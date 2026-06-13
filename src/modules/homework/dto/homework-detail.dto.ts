import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HomeworkSubmissionItemDto } from './homework-submission-item.dto';

export class HomeworkDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  groupId: string;

  @ApiPropertyOptional()
  groupName?: string;

  @ApiPropertyOptional()
  courseId?: string;

  @ApiPropertyOptional()
  courseName?: string;

  @ApiProperty()
  teacherId: string;

  @ApiPropertyOptional()
  dueDate?: string;

  @ApiProperty()
  maxPoints: number;

  @ApiPropertyOptional()
  maxScore?: number;

  @ApiProperty()
  allowResubmit: boolean;

  @ApiPropertyOptional({ type: [String] })
  attachedFileKeys?: string[];

  @ApiPropertyOptional()
  submissionsCount?: number;

  @ApiPropertyOptional()
  gradedCount?: number;

  @ApiPropertyOptional({ enum: ['published', 'closed'] })
  status?: 'published' | 'closed';

  @ApiProperty({ type: [HomeworkSubmissionItemDto] })
  submissions: HomeworkSubmissionItemDto[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
