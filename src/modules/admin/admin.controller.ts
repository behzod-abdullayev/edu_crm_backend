import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam,
} from '@nestjs/swagger';
import { AdminService, PaymentMonitorRow, PaymentSummaryRow } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shared/enums';
import {
  EnrollStudentDto, BulkNotificationDto, UpdatePricingDto,
  ManageCourseDto, ManageScheduleDto, ManageGroupDto, PaymentMonitoringFilters,
} from './dto/admin.dto';
import { AdminDashboardDto } from './dto/admin-dashboard.dto';
import { AdminAnalyticsDto } from './dto/admin-analytics.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { AdminScheduleQueryDto } from './dto/schedule-query.dto';
import { SchedulesService } from '../schedules/schedules.service';
import { CreateScheduleDto } from '../schedules/dto/create-schedule.dto';
import { UpdateScheduleDto } from '../schedules/dto/update-schedule.dto';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly schedulesService: SchedulesService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview metrics' })
  getOverview(@CurrentUser() user: User) {
    return this.adminService.getOverview(user.tenantId);
  }

  @Get('dashboard')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard overview data' })
  @ApiResponse({ status: 200, type: AdminDashboardDto })
  getDashboard(@TenantId() tenantId: string) {
    return this.adminService.getDashboard(tenantId);
  }

  @Get('analytics')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get admin analytics data for charts' })
  @ApiResponse({ status: 200, type: AdminAnalyticsDto })
  getAnalytics(@TenantId() tenantId: string) {
    return this.adminService.getAnalytics(tenantId);
  }

  @Get('reports/:type')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get report by type: operational | debt | attendance | payments' })
  @ApiParam({ name: 'type', enum: ['operational', 'debt', 'attendance', 'payments'] })
  @ApiResponse({ status: 200, description: 'Report data (shape varies by type)' })
  @ApiResponse({ status: 400, description: 'Unknown report type' })
  getReport(
    @Param('type') type: string,
    @TenantId() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.adminService.getReportByType(type, tenantId, query);
  }

  @Get('schedule')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all schedule events (admin view)' })
  @ApiResponse({ status: 200, description: 'List of schedule events', isArray: true })
  getSchedule(
    @TenantId() tenantId: string,
    @Query() query: AdminScheduleQueryDto,
  ) {
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to ? new Date(query.to) : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })();
    return this.schedulesService.getCalendar(tenantId, from, to, query.groupId, query.teacherId);
  }

  @Post('schedule')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a single schedule event' })
  @ApiResponse({ status: 201, description: 'Schedule event created' })
  createSchedule(
    @TenantId() tenantId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(dto, tenantId);
  }

  @Patch('schedule/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a schedule event' })
  @ApiResponse({ status: 200, description: 'Schedule event updated' })
  @ApiResponse({ status: 404, description: 'Schedule event not found' })
  updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, dto, tenantId);
  }

  @Get('payments/monitoring')
  @ApiOperation({ summary: 'Payment monitoring' })
  getPaymentMonitoring(
    @CurrentUser() user: User,
    @Query() filters: PaymentMonitoringFilters,
  ): Promise<{ payments: PaymentMonitorRow[]; summary: PaymentSummaryRow[] }> {
    return this.adminService.getPaymentMonitoring(user.tenantId, filters);
  }

  @Get('reports/operational')
  @ApiOperation({ summary: 'Operational report' })
  getOperationalReport(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.adminService.getOperationalReport(user.tenantId, new Date(from), new Date(to));
  }

  @Post('enroll')
  @ApiOperation({ summary: 'Enroll student in course' })
  enrollStudent(@CurrentUser() user: User, @Body() dto: EnrollStudentDto) {
    return this.adminService.enrollStudent(user.tenantId, dto);
  }

  @Get('reports/debt')
  @ApiOperation({ summary: 'Debt report' })
  getDebtReport(@CurrentUser() user: User) {
    return this.adminService.getDebtReport(user.tenantId);
  }

  @Patch('courses/:courseId/pricing')
  @ApiOperation({ summary: 'Update course pricing' })
  updatePricing(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: UpdatePricingDto,
  ) {
    return this.adminService.updatePricing(user.tenantId, courseId, dto);
  }

  @Post('notifications/bulk')
  @ApiOperation({ summary: 'Send bulk notification' })
  bulkNotification(@CurrentUser() user: User, @Body() dto: BulkNotificationDto) {
    return this.adminService.bulkSendNotification(user.tenantId, dto);
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create or update group' })
  manageGroup(@CurrentUser() user: User, @Body() dto: ManageGroupDto) {
    return this.adminService.manageGroup(user.tenantId, dto);
  }

  @Post('courses/manage')
  @ApiOperation({ summary: 'Manage course (update teacher, price, status, capacity)' })
  manageCourse(@CurrentUser() user: User, @Body() dto: ManageCourseDto) {
    return this.adminService.manageCourse(user.tenantId, dto);
  }

  @Post('schedules/manage')
  @ApiOperation({ summary: 'Create or update a schedule entry' })
  manageSchedule(@CurrentUser() user: User, @Body() dto: ManageScheduleDto) {
    return this.adminService.manageSchedule(user.tenantId, dto);
  }
}
