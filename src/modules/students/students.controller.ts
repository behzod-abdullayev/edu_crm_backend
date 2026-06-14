import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
  ApiExtraModels, ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';
import { StudentsService } from './students.service';
import { HomeworkService } from '../homework/homework.service';
import { CreateStudentDto, UpdateStudentDto, QueryStudentsDto } from './dto/create-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UserRole } from '../../shared/enums';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { StudentResponseDto } from './dto/student-response.dto';
import { StudentDetailResponseDto } from './dto/student-detail-response.dto';
import { StudentPerformanceDto } from './dto/student-performance.dto';
import { CourseGradesSummaryDto } from './dto/course-grades-summary.dto';
import { StudentAttendanceRecordDto } from './dto/student-attendance-record.dto';
import { EnrolledCourseResponseDto } from './dto/enrolled-course-response.dto';
import { StudentScheduleEventDto } from './dto/student-schedule-event.dto';

export class SubmitHomeworkBodyDto {
  @ApiPropertyOptional({ description: 'Text content of the submission' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Array of file keys from /files/upload endpoint',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileKeys?: string[];
}

@ApiTags('Students')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(StudentResponseDto)
@Controller({ path: 'students', version: '1' })
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly homeworkService: HomeworkService,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new student' })
  @ApiResponse({ status: 201, type: StudentResponseDto, description: 'Student created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() dto: CreateStudentDto, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.studentsService.create(dto, tenantId, user.id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'List all students with filters' })
  @ApiPaginatedResponse(StudentResponseDto)
  findAll(@Query() query: QueryStudentsDto, @TenantId() tenantId: string) {
    return this.studentsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student profile' })
  @ApiResponse({ status: 200, type: StudentDetailResponseDto, description: 'Student profile with summary stats' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.studentsService.getDetail(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update student profile' })
  @ApiResponse({ status: 200, type: StudentResponseDto, description: 'Student updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudentDto, @TenantId() tenantId: string) {
    return this.studentsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete student' })
  @ApiResponse({ status: 200, description: 'Student deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.studentsService.remove(id, tenantId);
  }

  @Get(':id/performance')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student performance summary' })
  @ApiResponse({ status: 200, type: StudentPerformanceDto, description: 'Performance data' })
  getPerformance(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.studentsService.getPerformance(id, tenantId);
  }

  @Get(':id/schedule')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student upcoming schedule' })
  @ApiResponse({
    status: 200,
    type: StudentScheduleEventDto,
    isArray: true,
    description: 'Student schedule events',
  })
  getSchedule(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.studentsService.getSchedule(id, tenantId);
  }

  @Get(':id/payments')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student payment history' })
  @ApiResponse({ status: 200, description: 'Payment records', isArray: true })
  getPayments(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.studentsService.getPayments(id, tenantId);
  }

  @Get(':id/certificates')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student certificates' })
  @ApiResponse({ status: 200, description: 'Certificate records', isArray: true })
  getCertificates(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.studentsService.getCertificates(id, tenantId);
  }

  @Get(':id/courses')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student enrolled courses with progress' })
  @ApiResponse({
    status: 200,
    type: EnrolledCourseResponseDto,
    isArray: true,
    description: 'Enrolled courses with progress',
  })
  getCourses(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.studentsService.getCourses(id, tenantId);
  }

  @Post(':id/enroll')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Enroll student in a course/group' })
  @ApiResponse({ status: 201, description: 'Student enrolled' })
  enroll(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { courseId: string; groupId?: string },
    @TenantId() tenantId: string,
  ) {
    return this.studentsService.enroll(id, dto, tenantId);
  }

  @Get(':id/attendance')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student attendance records' })
  @ApiResponse({
    status: 200,
    type: StudentAttendanceRecordDto,
    isArray: true,
    description: 'List of attendance records for the student',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.studentsService.getAttendance(id, tenantId, { from, to });
  }

  @Get(':id/grades')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student grades, grouped by course' })
  @ApiResponse({
    status: 200,
    type: CourseGradesSummaryDto,
    isArray: true,
    description: 'Per-course grade summaries with individual grade entries',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getGrades(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.studentsService.getGrades(id, tenantId);
  }

  @Get(':id/notifications')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get notifications for a student' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of student notifications',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getStudentNotifications(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<unknown> {
    return this.studentsService.getNotifications(id, tenantId, { page, limit });
  }

  @Post(':id/homework/:hwId/submit')
  @Roles(UserRole.STUDENT, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit homework (student-scoped path)' })
  @ApiResponse({ status: 201, description: 'Homework submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Homework not found' })
  submitHomework(
    @Param('id', ParseUUIDPipe) studentId: string,
    @Param('hwId', ParseUUIDPipe) hwId: string,
    @TenantId() tenantId: string,
    @Body() data: SubmitHomeworkBodyDto,
  ) {
    return this.homeworkService.submit(hwId, studentId, tenantId, data);
  }
}
