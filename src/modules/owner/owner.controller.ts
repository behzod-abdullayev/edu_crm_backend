import {
  Controller, Get, Post, Patch, Delete, Body, Query, Param, Res,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import {
  OwnerService,
  UserRow,
  PaginatedResult,
  GlobalDashboardKpis,
  BranchDto,
  TenantRow,
  AuditLogRow,
  FinancialOverviewResult,
} from './owner.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shared/enums';
import { UserManagementFilterDto } from './dto/user-management.dto';
import { HrOperationDto } from './dto/hr-operation.dto';
import { FinancialPeriodDto } from './dto/financial-period.dto';
import { ManageBranchDto } from './dto/manage-branch.dto';
import { SystemConfigDto } from './dto/system-config.dto';
import { ManageRoleDto } from './dto/manage-role.dto';
import { BranchResponseDto } from './dto/branch-response.dto';
import { GlobalAnalyticsDto } from './dto/global-analytics.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { OwnerCreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { OwnerAssignRoleDto } from './dto/assign-role.dto';
import { OwnerInviteUserDto } from './dto/invite-user.dto';

@ApiTags('Owner')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'owner', version: '1' })
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users with management info' })
  @ApiResponse({ status: 200, description: 'Returns paginated user list' })
  getUsers(@CurrentUser() user: User, @Query() filters: UserManagementFilterDto): Promise<PaginatedResult<UserRow>> {
    return this.ownerService.getUserManagement(user.tenantId, filters);
  }

  @Post('roles/manage')
  @ApiOperation({ summary: 'Manage user roles' })
  @ApiResponse({ status: 200, description: 'Role managed successfully' })
  manageRoles(@CurrentUser() user: User, @Body() dto: ManageRoleDto): Promise<{ message: string }> {
    return this.ownerService.manageRoles(user.tenantId, dto);
  }

  @Post('hr')
  @ApiOperation({ summary: 'HR operations: hire/fire/change_role' })
  @ApiResponse({ status: 200, description: 'HR operation applied' })
  @ApiResponse({ status: 400, description: 'Invalid operation' })
  @ApiResponse({ status: 404, description: 'User not found' })
  hrOperations(@CurrentUser() user: User, @Body() dto: HrOperationDto) {
    return this.ownerService.hrOperations(user.tenantId, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Global KPI dashboard' })
  @ApiResponse({ status: 200, description: 'Returns global KPI metrics' })
  getDashboard(@CurrentUser() user: User): Promise<{ kpis: GlobalDashboardKpis }> {
    return this.ownerService.getGlobalDashboard(user.tenantId);
  }

  @Get('analytics/financial')
  @ApiOperation({ summary: 'Financial analytics' })
  @ApiResponse({ status: 200, description: 'Returns financial analytics' })
  getFinancialAnalytics(
    @CurrentUser() user: User,
    @Query() query: FinancialPeriodDto,
  ): Promise<FinancialOverviewResult> {
    return this.ownerService.getFinancialAnalytics(user.tenantId, query.period || 'month');
  }

  @Get('analytics/global')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get global analytics overview' })
  @ApiResponse({ status: 200, type: GlobalAnalyticsDto })
  getGlobalAnalytics(@TenantId() tenantId: string): Promise<GlobalAnalyticsDto> {
    return this.ownerService.getGlobalAnalytics(tenantId);
  }

  @Get('branches')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'List all branches for this tenant' })
  @ApiResponse({ status: 200, type: BranchResponseDto, isArray: true })
  getBranches(@TenantId() tenantId: string): Promise<BranchResponseDto[]> {
    return this.ownerService.getBranches(tenantId);
  }

  @Post('branches')
  @ApiOperation({ summary: 'Create or update branch' })
  @ApiResponse({ status: 200, description: 'Branch saved' })
  manageBranches(@CurrentUser() user: User, @Body() dto: ManageBranchDto): Promise<{ branches: BranchDto[] }> {
    return this.ownerService.manageBranches(user.tenantId, dto);
  }

  @Get('roles')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'List all roles for this tenant' })
  @ApiResponse({ status: 200, type: RoleResponseDto, isArray: true })
  getRoles(@TenantId() tenantId: string): Promise<RoleResponseDto[]> {
    return this.ownerService.getRoles(tenantId);
  }

  @Post('roles')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new role for this tenant' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  createRole(@TenantId() tenantId: string, @Body() dto: OwnerCreateRoleDto): Promise<RoleResponseDto> {
    return this.ownerService.createRole(tenantId, dto);
  }

  @Patch('roles/:id/permissions')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update permissions for a role' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  updateRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateRolePermissionsDto,
  ): Promise<RoleResponseDto> {
    return this.ownerService.updateRolePermissions(id, tenantId, dto);
  }

  @Delete('roles/:id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 403, description: 'System roles cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role is still assigned to users' })
  deleteRole(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<{ message: string }> {
    return this.ownerService.deleteRole(tenantId, id);
  }

  @Post('users/:id/role')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  assignUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: OwnerAssignRoleDto,
  ) {
    return this.ownerService.assignUserRole(id, tenantId, dto);
  }

  @Post('users/invite')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Invite a new user (creates a pending account)' })
  @ApiResponse({ status: 201, description: 'User invited' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  inviteUser(@TenantId() tenantId: string, @Body() dto: OwnerInviteUserDto) {
    return this.ownerService.inviteUser(tenantId, dto);
  }

  @Get('system/config')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get system configuration' })
  @ApiResponse({ status: 200, description: 'System configuration object' })
  getSystemConfig(@TenantId() tenantId: string): Promise<TenantRow> {
    return this.ownerService.getSystemConfig(tenantId);
  }

  @Patch('system/config')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update system configuration' })
  @ApiResponse({ status: 200, description: 'Updated system configuration' })
  updateSystemConfig(@TenantId() tenantId: string, @Body() dto: SystemConfigDto) {
    return this.ownerService.updateSystemConfig(tenantId, dto);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get system config (alias)' })
  @ApiResponse({ status: 200, description: 'Returns system configuration' })
  getConfig(@CurrentUser() user: User): Promise<TenantRow> {
    return this.ownerService.getSystemConfig(user.tenantId);
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update system config (alias)' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  updateConfig(@CurrentUser() user: User, @Body() dto: SystemConfigDto) {
    return this.ownerService.updateSystemConfig(user.tenantId, dto);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  getAuditLogs(
    @CurrentUser() user: User,
    @Query() filters: Record<string, string>,
  ): Promise<PaginatedResult<AuditLogRow>> {
    return this.ownerService.getAuditLogs(user.tenantId, filters);
  }

  @Get('export/:type')
  @ApiOperation({ summary: 'Export data as Excel (students/payments/attendance)' })
  @ApiResponse({ status: 200, description: 'Returns Excel file' })
  async exportData(@CurrentUser() user: User, @Param('type') type: string, @Res() res: Response) {
    const buffer = await this.ownerService.exportData(user.tenantId, type);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}-export.xlsx"`,
    });
    res.send(buffer);
  }
}
