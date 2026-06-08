import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CustomRole } from './entities/role.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RolesRepository extends Repository<CustomRole> {
  constructor(private dataSource: DataSource) {
    super(CustomRole, dataSource.createEntityManager());
  }

  async findAllByTenant(tenantId: string): Promise<CustomRole[]> {
    return this.find({ where: { tenantId, isActive: true }, order: { name: 'ASC' } });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<CustomRole | null> {
    return this.findOne({ where: { id, tenantId } });
  }

  async findByName(name: string, tenantId: string): Promise<CustomRole | null> {
    return this.findOne({ where: { name, tenantId } });
  }

  async findSystemRoles(): Promise<CustomRole[]> {
    return this.find({ where: { isSystem: true } });
  }

  async assignToUser(userId: string, roleId: string, tenantId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET custom_role_id = $1 WHERE id = $2 AND tenant_id = $3`,
      [roleId, userId, tenantId],
    );
  }

  async revokeFromUser(userId: string, _roleId: string, tenantId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET custom_role_id = NULL WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    );
  }

  async getUsersByRole(roleId: string, tenantId: string): Promise<User[]> {
    return this.dataSource
      .getRepository(User)
      .createQueryBuilder('u')
      .where('u.customRoleId = :roleId AND u.tenantId = :tenantId', { roleId, tenantId })
      .getMany();
  }
}
