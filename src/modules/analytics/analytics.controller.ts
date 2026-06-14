import { Controller, Get, Query, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService, AnalyticsFilterDto } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Analytics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Overview dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Returns overview metrics' })
  getOverview(@CurrentUser() user: User, @Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getOverview(user.tenantId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Grade and attendance trend for a student or group' })
  @ApiResponse({ status: 200, description: 'Returns last 6 months of grade and attendance trend data' })
  getPerformance(
    @CurrentUser() user: User,
    @Query('studentId') studentId?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.analyticsService.getPerformance(user.tenantId, studentId, groupId);
  }

  @Get('students')
  @ApiOperation({ summary: 'Student analytics' })
  @ApiResponse({ status: 200, description: 'Returns student analytics data' })
  getStudentAnalytics(@CurrentUser() user: User, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getStudentAnalytics(user.tenantId, filters);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Attendance analytics' })
  @ApiResponse({ status: 200, description: 'Returns attendance analytics data' })
  getAttendanceAnalytics(@CurrentUser() user: User, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getAttendanceAnalytics(user.tenantId, filters);
  }

  @Get('financial')
  @ApiOperation({ summary: 'Financial analytics' })
  @ApiResponse({ status: 200, description: 'Returns financial analytics data' })
  getFinancialAnalytics(@CurrentUser() user: User, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getFinancialAnalytics(user.tenantId, filters);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Course analytics' })
  @ApiResponse({ status: 200, description: 'Returns course analytics data' })
  getCourseAnalytics(@CurrentUser() user: User, @Query('courseId') courseId?: string) {
    return this.analyticsService.getCourseAnalytics(user.tenantId, courseId);
  }

  @Get('teachers')
  @ApiOperation({ summary: 'Teacher analytics' })
  @ApiResponse({ status: 200, description: 'Returns teacher analytics data' })
  getTeacherAnalytics(@CurrentUser() user: User, @Query('teacherId') teacherId?: string) {
    return this.analyticsService.getTeacherAnalytics(user.tenantId, teacherId);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Export analytics as Excel file' })
  @ApiResponse({ status: 200, description: 'Returns Excel file buffer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportExcel(
    @CurrentUser() user: User,
    @Query('type') type: 'students' | 'attendance' | 'payments' | 'teachers',
    @Query() filters: AnalyticsFilterDto,
    @Res() res: Response,
  ) {
    const buffer = await this.analyticsService.exportToExcel(user.tenantId, type || 'students', filters);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type || 'export'}-analytics.xlsx"`,
    });
    res.send(buffer);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export analytics as CSV file' })
  @ApiResponse({ status: 200, description: 'Returns CSV text' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportCsv(
    @CurrentUser() user: User,
    @Query('type') type: 'students' | 'attendance' | 'payments' | 'teachers',
    @Query() filters: AnalyticsFilterDto,
    @Res() res: Response,
  ) {
    const csv = await this.analyticsService.exportToCsv(user.tenantId, type || 'students', filters);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type || 'export'}-analytics.csv"`,
    });
    res.send(csv);
  }
}
