import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shared/enums';
import { PaginationDto } from '../../common/utils/pagination.util';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';

@ApiTags('Groups')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(GroupResponseDto)
@Controller({ path: 'groups', version: '1' })
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a group' })
  @ApiResponse({ status: 201, type: GroupResponseDto, description: 'Group created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() dto: CreateGroupDto, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.groupsService.create(dto, tenantId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  @ApiPaginatedResponse(GroupResponseDto)
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.groupsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details with students' })
  @ApiResponse({ status: 200, type: GroupResponseDto, description: 'Group details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.groupsService.findOne(id, tenantId);
  }

  @Get(':id/homework')
  @ApiOperation({ summary: 'Get homework assignments for this group' })
  @ApiResponse({ status: 200, description: 'List of homework assignments', isArray: true })
  @ApiResponse({ status: 404, description: 'Not found' })
  getHomework(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.groupsService.getHomework(id, tenantId);
  }

  @Get(':id/attendance')
  @ApiOperation({ summary: 'Get attendance records for this group' })
  @ApiResponse({ status: 200, description: 'Attendance records grouped by date' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getAttendance(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.groupsService.getAttendance(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update group' })
  @ApiResponse({ status: 200, type: GroupResponseDto, description: 'Group updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.update(id, tenantId, dto, user.id);
  }

  @Post(':id/students/:studentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add student to group' })
  @ApiResponse({ status: 201, type: GroupResponseDto, description: 'Student added to group' })
  @ApiResponse({ status: 404, description: 'Group or student not found' })
  addStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @TenantId() tenantId: string,
  ) {
    return this.groupsService.addStudent(id, studentId, tenantId);
  }

  @Delete(':id/students/:studentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove student from group' })
  @ApiResponse({ status: 200, type: GroupResponseDto, description: 'Student removed from group' })
  removeStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @TenantId() tenantId: string,
  ) {
    return this.groupsService.removeStudent(id, studentId, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({ status: 200, description: 'Group deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.groupsService.remove(id, tenantId);
  }
}
