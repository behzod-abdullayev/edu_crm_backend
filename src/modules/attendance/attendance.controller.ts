import { Controller, Get, Post, Body, UseGuards, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto, BulkMarkAttendanceDto, QueryAttendanceDto } from './dto/mark-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shared/enums';

@ApiTags('Attendance')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'attendance', version: '1' })
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Mark single attendance' })
  mark(@Body() dto: MarkAttendanceDto, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.attendanceService.mark(dto, tenantId, user.id);
  }

  @Post('bulk')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Bulk mark attendance for all students in a schedule' })
  bulkMark(@Body() dto: BulkMarkAttendanceDto, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.attendanceService.bulkMark(dto, tenantId, user.id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'List attendance with filters' })
  findAll(@Query() query: QueryAttendanceDto, @TenantId() tenantId: string) {
    return this.attendanceService.findAll(tenantId, query);
  }

  @Get('report')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Attendance report by student/group/date range' })
  getReport(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupId') groupId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.attendanceService.getReport(tenantId, new Date(from), new Date(to), groupId, studentId);
  }

  @Get('student/:studentId/summary')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Student attendance summary' })
  getStudentSummary(@Param('studentId', ParseUUIDPipe) studentId: string, @TenantId() tenantId: string) {
    return this.attendanceService.getStudentSummary(studentId, tenantId);
  }
}
