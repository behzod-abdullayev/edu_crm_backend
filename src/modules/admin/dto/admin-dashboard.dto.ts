import { ApiProperty } from '@nestjs/swagger';

export class ActivityItemDto {
  @ApiProperty({ description: 'Activity record ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Activity type', example: 'payment' })
  type: string;

  @ApiProperty({ description: 'Human-readable description', example: 'Student enrolled in English course' })
  description: string;

  @ApiProperty({ description: 'ISO timestamp of the activity', example: '2024-03-15T09:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: 'Name of the user who performed the action', nullable: true, example: 'John Smith' })
  actorName: string | null;
}

export class AdminDashboardDto {
  @ApiProperty({ description: 'Total number of active students', example: 342 })
  totalStudents: number;

  @ApiProperty({ description: 'Total number of active teachers', example: 24 })
  totalTeachers: number;

  @ApiProperty({ description: 'Total number of courses (all statuses)', example: 18 })
  totalCourses: number;

  @ApiProperty({ description: 'Total revenue this month in base currency (e.g. UZS tiyin)', example: 45000000 })
  totalRevenue: number;

  @ApiProperty({ description: 'Currency code', example: 'UZS' })
  currency: string;

  @ApiProperty({ description: 'Number of currently active groups', example: 15 })
  activeGroups: number;

  @ApiProperty({ description: 'Number of payments in pending status', example: 12 })
  pendingPayments: number;

  @ApiProperty({ description: 'Number of payments in overdue status', example: 5 })
  overduePayments: number;

  @ApiProperty({ description: 'Attendance rate for today as percentage 0-100', example: 87.5 })
  attendanceRate: number;

  @ApiProperty({ description: 'Attendance rate for today as percentage 0-100', example: 87.5 })
  todayAttendanceRate: number;

  @ApiProperty({ description: 'Number of new students enrolled this calendar month', example: 23 })
  newStudentsThisMonth: number;

  @ApiProperty({ description: 'Revenue change compared to previous month as percentage', example: 12.4 })
  revenueChangePercent: number;

  @ApiProperty({
    description: 'Recent activity feed items',
    type: [ActivityItemDto],
  })
  recentActivities: ActivityItemDto[];
}
