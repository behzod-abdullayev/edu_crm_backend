import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { CustomRole } from './entities/role.entity';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UserRole } from '../../shared/enums';
import { ROLE_PERMISSIONS } from '../../common/utils/permissions.util';

// The 4 tenant-level roles every tenant must have a permission set for.
// Platform-level Super Admin is excluded — it is not managed per-tenant.
const SYSTEM_ROLES: UserRole[] = [
  UserRole.STUDENT,
  UserRole.TEACHER,
  UserRole.ADMIN,
  UserRole.OWNER,
];

@Injectable()
export class RolesService {
  constructor(private rolesRepository: RolesRepository) {}

  async create(dto: CreateRoleDto, tenantId: string): Promise<CustomRole> {
    const role = this.rolesRepository.create({ ...dto, tenantId });
    return this.rolesRepository.save(role);
  }

  // OBS-13: a tenant's custom_roles table starts empty, which made the Owner
  // Permissions matrix render with zero permissions and fall back to the
  // "Unable to load permission matrix" empty state. Lazily seed the 4 base
  // roles (student/teacher/admin/owner) with their real permission sets from
  // ROLE_PERMISSIONS the first time a tenant's roles are requested.
  async ensureSystemRoles(tenantId: string): Promise<void> {
    const existing = await this.rolesRepository.findAllByTenant(tenantId);
    const existingNames = new Set(existing.map((r) => r.name));
    const missing = SYSTEM_ROLES.filter((name) => !existingNames.has(name));
    if (missing.length === 0) return;

    await Promise.all(
      missing.map((name) =>
        this.rolesRepository.save(
          this.rolesRepository.create({
            tenantId,
            name,
            permissions: ROLE_PERMISSIONS[name],
            isActive: true,
            isSystem: true,
          }),
        ),
      ),
    );
  }

  async findAll(tenantId: string): Promise<CustomRole[]> {
    await this.ensureSystemRoles(tenantId);
    return this.rolesRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<CustomRole> {
    const role = await this.rolesRepository.findByIdAndTenant(id, tenantId);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, tenantId: string, dto: Partial<CustomRole>): Promise<CustomRole> {
    const role = await this.findOne(id, tenantId);
    // OBS-13: "Owner always has full access" — owner permissions are
    // immutable and must be enforced server-side, not just hidden in the UI.
    if (role.isSystem && role.name === UserRole.OWNER) {
      throw new ForbiddenException('Owner permissions cannot be modified');
    }
    Object.assign(role, dto);
    return this.rolesRepository.save(role);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const role = await this.findOne(id, tenantId);
    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted');
    }
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
