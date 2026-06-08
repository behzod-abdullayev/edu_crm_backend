import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UserRole } from '../../shared/enums';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('Roles')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Create custom role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  create(@Body() dto: CreateRoleDto, @TenantId() tenantId: string) {
    return this.rolesService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List custom roles' })
  @ApiResponse({ status: 200, description: 'Returns all roles for tenant' })
  findAll(@TenantId() tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Returns role' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.rolesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string, @Body() dto: Partial<CreateRoleDto>) {
    return this.rolesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.rolesService.remove(id, tenantId);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned to user' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  assignToUser(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.rolesService.assignToUser(id, dto.userId, tenantId);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke role from user' })
  @ApiResponse({ status: 200, description: 'Role revoked from user' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  revokeFromUser(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.rolesService.revokeFromUser(id, dto.userId, tenantId);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'List users with this role' })
  @ApiResponse({ status: 200, description: 'Returns users with role' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  getUsersByRole(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.rolesService.getUsersByRole(id, tenantId);
  }
}
