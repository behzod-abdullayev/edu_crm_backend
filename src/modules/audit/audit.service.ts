import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from '../../shared/enums';
import { paginate, PaginatedResult, PaginationDto } from '../../common/utils/pagination.util';
import { InjectRepository } from '@nestjs/typeorm';

interface AuditLogPayload {
  userId?: string;
  tenantId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  notes?: string;
}

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  async log(payload: AuditLogPayload): Promise<AuditLog> {
    const log = this.repo.create(payload);
    return this.repo.save(log);
  }

  async findAll(tenantId: string, query: PaginationDto & { userId?: string; entityType?: string; action?: string }): Promise<PaginatedResult<AuditLog>> {
    const qb = this.repo.createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'user')
      .where('a.tenantId = :tenantId', { tenantId });

    if (query.userId) qb.andWhere('a.userId = :userId', { userId: query.userId });
    if (query.entityType) qb.andWhere('a.entityType = :entityType', { entityType: query.entityType });
    if (query.action) qb.andWhere('a.action = :action', { action: query.action });

    qb.orderBy('a.createdAt', 'DESC');
    return paginate(qb, query);
  }

  @OnEvent('audit.log')
  async handleAuditEvent(payload: AuditLogPayload): Promise<void> {
    await this.log(payload);
  }
}
