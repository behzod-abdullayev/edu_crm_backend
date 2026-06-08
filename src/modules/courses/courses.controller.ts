import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { EnrollDto } from './dto/enroll.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UserRole } from '../../shared/enums';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { CourseResponseDto } from './dto/course-response.dto';
import { PaginationDto } from '../../common/utils/pagination.util';

@ApiTags('Courses')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(CourseResponseDto)
@Controller({ path: 'courses', version: '1' })
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create course' })
  @ApiResponse({ status: 201, type: CourseResponseDto, description: 'Course created' })
  create(@Body() dto: CreateCourseDto, @TenantId() tenantId: string) {
    return this.coursesService.create(dto, tenantId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List all courses' })
  @ApiPaginatedResponse(CourseResponseDto)
  findAll(@Query() query: PaginationDto, @TenantId() tenantId: string) {
    return this.coursesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get course details' })
  @ApiResponse({ status: 200, type: CourseResponseDto, description: 'Course details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.coursesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update course' })
  @ApiResponse({ status: 200, type: CourseResponseDto, description: 'Course updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDto, @TenantId() tenantId: string) {
    return this.coursesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete course' })
  @ApiResponse({ status: 200, description: 'Course deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.coursesService.remove(id, tenantId);
  }

  @Patch(':id/publish')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish course' })
  @ApiResponse({ status: 200, type: CourseResponseDto, description: 'Course published' })
  publish(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.coursesService.publish(id, tenantId);
  }

  @Get(':id/modules')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all modules for a course with their lessons' })
  @ApiResponse({
    status: 200,
    description: 'Array of course modules with nested lessons',
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  getModules(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.coursesService.getModules(id, tenantId);
  }

  @Post(':id/modules')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Add module to course' })
  @ApiResponse({ status: 201, description: 'Module added' })
  addModule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateModuleDto, @TenantId() tenantId: string) {
    return this.coursesService.addModule(id, dto, tenantId);
  }

  @Post(':id/lessons')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Add lesson to course' })
  @ApiResponse({ status: 201, description: 'Lesson added' })
  addLesson(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateLessonDto, @TenantId() tenantId: string) {
    return this.coursesService.addLesson(id, dto, tenantId);
  }

  @Get(':id/students')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get enrolled students with progress' })
  @ApiResponse({ status: 200, description: 'Enrolled students', isArray: true })
  getStudents(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.coursesService.getStudents(id, tenantId);
  }

  @Post(':id/enroll/:studentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Enroll a student in this course' })
  @ApiResponse({ status: 201, description: 'Student successfully enrolled' })
  @ApiResponse({ status: 404, description: 'Course or student not found' })
  @ApiResponse({ status: 409, description: 'Student already enrolled' })
  enrollStudent(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @TenantId() tenantId: string,
  ) {
    return this.coursesService.enrollStudent(courseId, studentId, {}, tenantId);
  }

  @Get(':id/progress/:studentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student progress in course' })
  @ApiResponse({ status: 200, description: 'Course progress data' })
  getProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @TenantId() tenantId: string,
  ) {
    return this.coursesService.getProgress(id, studentId, tenantId);
  }

  @Patch(':id/progress/:studentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update student lesson completion' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: { lessonId: string; completed: boolean },
    @TenantId() tenantId: string,
  ) {
    return this.coursesService.updateProgress(id, studentId, dto, tenantId);
  }
}
