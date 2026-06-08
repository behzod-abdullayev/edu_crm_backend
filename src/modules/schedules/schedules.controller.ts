import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto, CancelScheduleDto } from './dto/update-schedule.dto';
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UserRole } from '../../shared/enums';

@ApiTags('Schedules')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'schedules', version: '1' })
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create schedule entry' })
  create(@Body() dto: CreateScheduleDto, @TenantId() tenantId: string) {
    return this.schedulesService.create(dto, tenantId);
  }

  @Post('bulk')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk generate recurring schedule for a group' })
  bulkCreate(@Body() dto: BulkCreateScheduleDto, @TenantId() tenantId: string) {
    return this.schedulesService.bulkCreate(dto, tenantId);
  }

  @Get('calendar')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Calendar view with date range filter' })
  getCalendar(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupId') groupId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.schedulesService.getCalendar(tenantId, new Date(from), new Date(to), groupId, teacherId);
  }

  @Get('teacher/:teacherId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Get teacher's schedule" })
  getTeacherSchedule(@Param('teacherId', ParseUUIDPipe) teacherId: string, @TenantId() tenantId: string) {
    return this.schedulesService.getTeacherSchedule(teacherId, tenantId);
  }

  @Get('student/:studentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: "Get student's schedule" })
  getStudentSchedule(@Param('studentId', ParseUUIDPipe) studentId: string, @TenantId() tenantId: string) {
    return this.schedulesService.getStudentSchedule(studentId, tenantId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get schedule by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.schedulesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update schedule' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScheduleDto, @TenantId() tenantId: string) {
    return this.schedulesService.update(id, dto, tenantId);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Cancel schedule with reason' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelScheduleDto, @TenantId() tenantId: string) {
    return this.schedulesService.cancel(id, dto.cancelReason, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete schedule' })
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.schedulesService.remove(id, tenantId);
  }
}
