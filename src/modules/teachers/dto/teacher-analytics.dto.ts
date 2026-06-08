import { ApiProperty } from '@nestjs/swagger';

export class StudentPerformanceItemDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  avgScore: number;

  @ApiProperty()
  attendanceRate: number;
}

export class AttendanceByMonthDto {
  @ApiProperty({ example: '2024-01' })
  month: string;

  @ApiProperty({ example: 87.5 })
  rate: number;
}

export class HomeworkStatsDto {
  @ApiProperty()
  assigned: number;

  @ApiProperty()
  graded: number;

  @ApiProperty()
  pending: number;
}

export class TeacherAnalyticsDto {
  @ApiProperty()
  totalStudents: number;

  @ApiProperty()
  totalGroups: number;

  @ApiProperty()
  avgAttendanceRate: number;

  @ApiProperty()
  avgHomeworkScore: number;

  @ApiProperty({ type: HomeworkStatsDto })
  homeworkStats: HomeworkStatsDto;

  @ApiProperty({ type: [AttendanceByMonthDto] })
  attendanceByMonth: AttendanceByMonthDto[];

  @ApiProperty({ type: [StudentPerformanceItemDto] })
  studentPerformance: StudentPerformanceItemDto[];
}
