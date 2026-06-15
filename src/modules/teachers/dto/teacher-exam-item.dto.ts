import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeacherExamItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  groupId?: string;

  @ApiPropertyOptional()
  groupName?: string;

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
  maxAttempts: number;

  @ApiProperty()
  isPublished: boolean;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  createdAt: string;
}

export class TeacherExamListDto {
  @ApiProperty({ type: [TeacherExamItemDto] })
  data: TeacherExamItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
