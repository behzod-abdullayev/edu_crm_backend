import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Repository } from 'typeorm';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async use(req: Request & { tenantId?: string }, _res: Response, next: NextFunction): Promise<void> {
    const tenantId = req.headers['x-tenant-id'] as string;
    const host = req.hostname;

    if (tenantId) {
      req.tenantId = tenantId;
    } else {
      // Try to resolve from domain
      const tenant = await this.tenantRepo.findOne({ where: { domain: host, isActive: true } });
      if (tenant) {
        req.tenantId = tenant.id;
      }
    }
    next();
  }
}
