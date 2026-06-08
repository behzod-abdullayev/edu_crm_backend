import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsRepository extends Repository<Tenant> {
  constructor(private dataSource: DataSource) {
    super(Tenant, dataSource.createEntityManager());
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.findOne({ where: { slug } });
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    return this.findOne({ where: { domain } });
  }

  async findActivePaginated(page: number, limit: number, search?: string): Promise<[Tenant[], number]> {
    const qb = this.createQueryBuilder('tenant').where('tenant.deletedAt IS NULL');
    if (search) {
      qb.andWhere('(tenant.name ILIKE :s OR tenant.slug ILIKE :s)', { s: `%${search}%` });
    }
    return qb.orderBy('tenant.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  async countActiveStudents(tenantId: string): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    return parseInt(result[0].count, 10);
  }
}
