import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentAttendanceSummaryDto {
  @ApiProperty()
  present: number;

  @ApiProperty()
  absent: number;

  @ApiProperty()
  late: number;

  @ApiProperty()
  excused: number;

  @ApiProperty()
  rate: number;
}

export class StudentRecentGradeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  courseId: string;

  @ApiPropertyOptional()
  courseName?: string;

  @ApiPropertyOptional()
  homeworkId?: string;

  @ApiProperty()
  grade: number;

  @ApiProperty()
  maxGrade: number;

  @ApiPropertyOptional()
  feedback?: string;

  @ApiProperty()
  gradedAt: string;
}

export class StudentDetailResponseDto {
  @ApiProperty()
  id: string;

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
  groupId?: string;

  @ApiPropertyOptional()
  groupName?: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  enrolledAt: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: [StudentRecentGradeDto] })
  recentGrades: StudentRecentGradeDto[];

  @ApiProperty({ type: [Object] })
  courses: unknown[];

  @ApiProperty({ type: StudentAttendanceSummaryDto })
  attendanceSummary: StudentAttendanceSummaryDto;
}
