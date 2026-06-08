import { ApiProperty } from '@nestjs/swagger';

export class MonthlyDataPointDto {
  @ApiProperty({ description: 'Month label in YYYY-MM format', example: '2024-01' })
  month: string;

  @ApiProperty({ description: 'Aggregated value for this month', example: 5200000 })
  value: number;
}

export class RevenueDataPointDto {
  @ApiProperty({ description: 'Date label (ISO date string)', example: '2024-03-01' })
  date: string;

  @ApiProperty({ description: 'Total revenue for this date period', example: 5200000 })
  revenue: number;

  @ApiProperty({ description: 'Number of payments received', example: 18 })
  payments: number;
}

export class AttendanceDataPointDto {
  @ApiProperty({ description: 'Date label', example: '2024-03-15' })
  date: string;

  @ApiProperty({ description: 'Number of students present', example: 145 })
  present: number;

  @ApiProperty({ description: 'Number of students absent', example: 12 })
  absent: number;

  @ApiProperty({ description: 'Number of students late', example: 8 })
  late: number;
}

export class EnrollmentDataPointDto {
  @ApiProperty({ description: 'Month label', example: '2024-03' })
  month: string;

  @ApiProperty({ description: 'Number of new enrollments in this month', example: 34 })
  enrollments: number;
}

export class CoursePopularityDto {
  @ApiProperty({ description: 'Course title', example: 'English for Beginners' })
  courseTitle: string;

  @ApiProperty({ description: 'Total enrolled students', example: 87 })
  enrolled: number;

  @ApiProperty({ description: 'Average completion percentage', example: 62.3 })
  avgCompletion: number;
}

export class AdminAnalyticsDto {
  @ApiProperty({
    description: 'Revenue by month — legacy monthly aggregation',
    type: [MonthlyDataPointDto],
  })
  revenueByMonth: MonthlyDataPointDto[];

  @ApiProperty({
    description: 'Enrollments by month — legacy monthly aggregation',
    type: [MonthlyDataPointDto],
  })
  enrollmentsByMonth: MonthlyDataPointDto[];

  @ApiProperty({
    description: 'Attendance by month — legacy monthly aggregation',
    type: [MonthlyDataPointDto],
  })
  attendanceByMonth: MonthlyDataPointDto[];

  @ApiProperty({ description: 'Average attendance rate across all groups', example: 87.5 })
  avgAttendanceRate: number;

  @ApiProperty({ description: 'Total revenue for the selected period', example: 120000000 })
  totalRevenue: number;

  @ApiProperty({ description: 'Total enrollments for the selected period', example: 342 })
  totalEnrollments: number;

  @ApiProperty({
    description: 'Revenue timeline — one point per day for last 30 days',
    type: [RevenueDataPointDto],
  })
  revenueTimeline: RevenueDataPointDto[];

  @ApiProperty({
    description: 'Attendance trend — one point per day for last 30 days',
    type: [AttendanceDataPointDto],
  })
  attendanceTrend: AttendanceDataPointDto[];

  @ApiProperty({
    description: 'Enrollment trend — one point per month for last 12 months',
    type: [EnrollmentDataPointDto],
  })
  enrollmentTrend: EnrollmentDataPointDto[];

  @ApiProperty({
    description: 'Top courses by enrollment',
    type: [CoursePopularityDto],
  })
  topCourses: CoursePopularityDto[];
}
