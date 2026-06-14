import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeacherLessonItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  courseId: string;

  @ApiPropertyOptional()
  groupId?: string;

  @ApiPropertyOptional()
  groupName?: string;

  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  videoUrl?: string;

  @ApiPropertyOptional()
  fileUrl?: string;

  @ApiProperty()
  order: number;

  @ApiPropertyOptional()
  durationMinutes?: number;

  @ApiPropertyOptional()
  isPublished?: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class TeacherLessonListDto {
  @ApiProperty({ type: [TeacherLessonItemDto] })
  data: TeacherLessonItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
