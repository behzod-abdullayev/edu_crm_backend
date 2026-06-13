import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeachersDto } from './dto/query-teachers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UserRole } from '../../shared/enums';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { TeacherResponseDto } from './dto/teacher-response.dto';
import { TeacherAnalyticsDto } from './dto/teacher-analytics.dto';

@ApiTags('Teachers')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(TeacherResponseDto)
@Controller({ path: 'teachers', version: '1' })
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new teacher' })
  @ApiResponse({ status: 201, type: TeacherResponseDto, description: 'Teacher created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() dto: CreateTeacherDto, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.teachersService.create(dto, tenantId, user.id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all teachers' })
  @ApiPaginatedResponse(TeacherResponseDto)
  findAll(@Query() query: QueryTeachersDto, @TenantId() tenantId: string) {
    return this.teachersService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get teacher profile' })
  @ApiResponse({ status: 200, type: TeacherResponseDto, description: 'Teacher profile' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.teachersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update teacher profile' })
  @ApiResponse({ status: 200, type: TeacherResponseDto, description: 'Teacher updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeacherDto, @TenantId() tenantId: string) {
    return this.teachersService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete teacher' })
  @ApiResponse({ status: 200, description: 'Teacher deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.teachersService.remove(id, tenantId);
  }

  @Get(':id/groups')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get teacher assigned groups' })
  @ApiResponse({ status: 200, description: 'Teacher groups', isArray: true })
  getGroups(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.teachersService.getGroups(id, tenantId);
  }

  @Get(':id/schedule')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get teacher weekly schedule' })
  @ApiResponse({ status: 200, description: 'Teacher schedule', isArray: true })
  getSchedule(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.teachersService.getSchedule(id, tenantId);
  }

  @Get(':id/students')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all students across teacher groups' })
  @ApiResponse({ status: 200, description: 'Students in teacher groups', isArray: true })
  getStudents(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.teachersService.getStudents(id, tenantId);
  }

  @Get(':id/stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get teacher performance stats' })
  @ApiResponse({ status: 200, description: 'Teacher statistics' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  getStats(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.teachersService.getStats(id, tenantId);
  }

  @Get(':id/analytics')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: 'Get teacher analytics',
    description: 'Returns aggregated performance analytics for a teacher (groups, students, attendance, homework).',
  })
  @ApiResponse({ status: 200, type: TeacherAnalyticsDto, description: 'Teacher analytics and performance data' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.teachersService.getAnalytics(id, tenantId);
  }
}
