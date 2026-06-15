import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeacherStudentItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  groupName?: string;

  @ApiPropertyOptional()
  attendanceRate?: number;

  @ApiPropertyOptional()
  averageGrade?: number;
}

export class TeacherStudentListDto {
  @ApiProperty({ type: [TeacherStudentItemDto] })
  data: TeacherStudentItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
