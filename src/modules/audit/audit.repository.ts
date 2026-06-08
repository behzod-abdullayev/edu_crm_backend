import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditRepository extends Repository<AuditLog> {
  constructor(private dataSource: DataSource) {
    super(AuditLog, dataSource.createEntityManager());
  }

  async findPaginated(tenantId: string, page: number, limit: number, userId?: string, action?: string): Promise<[AuditLog[], number]> {
    const qb = this.createQueryBuilder('log').where('log.tenantId = :tenantId', { tenantId });
    if (userId) qb.andWhere('log.userId = :userId', { userId });
    if (action) qb.andWhere('log.action = :action', { action });
    return qb.orderBy('log.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  async logAction(data: Partial<AuditLog>): Promise<AuditLog> {
    const log = this.create(data);
    return this.save(log);
  }
}
