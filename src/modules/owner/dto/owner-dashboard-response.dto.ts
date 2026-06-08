import { ApiProperty } from '@nestjs/swagger';

export class GlobalDashboardKpisDto {
  @ApiProperty({ description: 'Total students enrolled', example: 342 })
  totalStudents: number;

  @ApiProperty({ description: 'Total teachers', example: 24 })
  totalTeachers: number;

  @ApiProperty({ description: 'Total platform revenue', example: 120000000 })
  totalRevenue: number;

  @ApiProperty({ description: 'Number of active student groups', example: 15 })
  activeGroups: number;

  @ApiProperty({
    description: 'Platform-wide average attendance rate in percent',
    example: 87.3,
  })
  averageAttendance: number;

  @ApiProperty({
    description: 'Number of new students enrolled this calendar month',
    example: 28,
  })
  newStudentsThisMonth: number;

  @ApiProperty({
    description: 'Revenue change percent vs previous month',
    example: 8.5,
  })
  revenueChangePercent: number;
}

export class OwnerDashboardResponseDto {
  @ApiProperty({
    description: 'Global KPI metrics for the owner dashboard',
    type: GlobalDashboardKpisDto,
  })
  kpis: GlobalDashboardKpisDto;
}
