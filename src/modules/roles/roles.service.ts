import { Injectable, NotFoundException } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { CustomRole } from './entities/role.entity';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private rolesRepository: RolesRepository) {}

  async create(dto: CreateRoleDto, tenantId: string): Promise<CustomRole> {
    const role = this.rolesRepository.create({ ...dto, tenantId });
    return this.rolesRepository.save(role);
  }

  async findAll(tenantId: string): Promise<CustomRole[]> {
    return this.rolesRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<CustomRole> {
    const role = await this.rolesRepository.findByIdAndTenant(id, tenantId);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, tenantId: string, dto: Partial<CustomRole>): Promise<CustomRole> {
    const role = await this.findOne(id, tenantId);
    Object.assign(role, dto);
    return this.rolesRepository.save(role);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const role = await this.findOne(id, tenantId);
    await this.rolesRepository.remove(role);
  }

  async assignToUser(roleId: string, userId: string, tenantId: string): Promise<void> {
    await this.findOne(roleId, tenantId);
    await this.rolesRepository.assignToUser(userId, roleId, tenantId);
  }

  async revokeFromUser(roleId: string, userId: string, tenantId: string): Promise<void> {
    await this.findOne(roleId, tenantId);
    await this.rolesRepository.revokeFromUser(userId, roleId, tenantId);
  }

  async getUsersByRole(roleId: string, tenantId: string): Promise<User[]> {
    await this.findOne(roleId, tenantId);
    return this.rolesRepository.getUsersByRole(roleId, tenantId);
  }
}
