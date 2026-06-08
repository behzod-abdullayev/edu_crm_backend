import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class KpiDto {
  monthlyRevenue: number;
  activeStudents: number;
  teacherCount: number;
  attendanceRate: number;
  completionRate: number;
}

export class GlobalDashboardDto {
  kpis: KpiDto;
}

export class GlobalDashboardFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
}
