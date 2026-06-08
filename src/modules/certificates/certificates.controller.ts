import { Controller, Get, Post, Body, Patch, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shared/enums';
import { Certificate } from './entities/certificate.entity';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Certificates')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'certificates', version: '1' })
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('issue')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Issue a certificate' })
  issue(@Body() dto: Partial<Certificate>, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.certificatesService.issue(dto, tenantId, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List all certificates' })
  findAll(@TenantId() tenantId: string) {
    return this.certificatesService.findAll(tenantId);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get student certificates' })
  findByStudent(@Param('studentId', ParseUUIDPipe) studentId: string, @TenantId() tenantId: string) {
    return this.certificatesService.findByStudent(studentId, tenantId);
  }

  @Public()
  @Get('verify/:code')
  @ApiOperation({ summary: 'Verify certificate by code (public)' })
  verify(@Param('code') code: string) {
    return this.certificatesService.verify(code);
  }

  @Patch(':id/revoke')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Revoke a certificate' })
  revoke(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.certificatesService.revoke(id, tenantId);
  }
}
