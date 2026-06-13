import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeacherHomeworkItemDto {
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

  @ApiProperty()
  allowResubmit: boolean;

  @ApiPropertyOptional({ type: [String] })
  attachedFileKeys?: string[];

  @ApiPropertyOptional()
  submissionsCount?: number;

  @ApiPropertyOptional()
  submissionCount?: number;

  @ApiPropertyOptional()
  gradedCount?: number;

  @ApiPropertyOptional({ enum: ['published', 'closed'] })
  status?: 'published' | 'closed';

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class TeacherHomeworkListDto {
  @ApiProperty({ type: [TeacherHomeworkItemDto] })
  data: TeacherHomeworkItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
