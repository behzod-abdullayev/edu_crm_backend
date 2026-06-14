import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../shared/enums';
import { Tenant, TenantFeatureFlags } from './entities/tenant.entity';
import { TenantPublicConfigDto } from './dto/tenant-public-config.dto';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Tenants')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Public endpoint — no authentication required.
   * Must be declared before any route with a dynamic :id segment so NestJS
   * does not accidentally match "config" as an id parameter.
   */
  @Public()
  @Roles()
  @Get('config')
  @ApiOperation({ summary: 'Get tenant public configuration by slug (no auth required)' })
  @ApiQuery({ name: 'slug', required: true, description: 'Tenant slug identifier', example: 'academy1' })
  @ApiResponse({ status: 200, type: TenantPublicConfigDto, description: 'Tenant public config' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getPublicConfig(@Query('slug') slug: string): Promise<TenantPublicConfigDto> {
    if (!slug) {
      throw new BadRequestException('slug query parameter is required');
    }
    return this.tenantsService.getPublicConfig(slug);
  }

  /**
   * Authenticated endpoint — any logged-in user (any role) can fetch their own
   * tenant's branding and feature flags. Used by the frontend to load feature
   * flags on hosts where the subdomain-based slug cannot be determined (e.g. localhost).
   * Must be declared before ':id' so NestJS does not match "config" as an id.
   */
  @Roles()
  @Get('config/mine')
  @ApiOperation({ summary: "Get the current user's tenant public configuration" })
  @ApiResponse({ status: 200, type: TenantPublicConfigDto, description: 'Tenant public config' })
  async getMyConfig(@TenantId() tenantId: string): Promise<TenantPublicConfigDto> {
    return this.tenantsService.getPublicConfigByTenantId(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() dto: Partial<Tenant>) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<Tenant>) {
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/feature-flags')
  @ApiOperation({ summary: 'Toggle feature flag' })
  updateFeatureFlag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { flag: string; value: boolean },
  ) {
    return this.tenantsService.updateFeatureFlag(id, body.flag as keyof TenantFeatureFlags, body.value);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update tenant settings' })
  updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() settings: Record<string, unknown>,
  ) {
    return this.tenantsService.updateSettings(id, settings);
  }

  @Post(':id/branches')
  @ApiOperation({ summary: 'Add branch to tenant' })
  addBranch(@Param('id', ParseUUIDPipe) id: string, @Body('branch') branch: string) {
    return this.tenantsService.addBranch(id, branch);
  }
}
