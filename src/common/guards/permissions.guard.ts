import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission, UserRole } from '../../shared/enums';
import { User } from '../../modules/users/entities/user.entity';

const ROLE_PERMISSIONS: { [key in UserRole]: Permission[] } = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.OWNER]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.USER_CREATE, Permission.USER_VIEW, Permission.USER_UPDATE,
    Permission.STUDENT_CREATE, Permission.STUDENT_VIEW, Permission.STUDENT_UPDATE, Permission.STUDENT_DELETE,
    Permission.TEACHER_CREATE, Permission.TEACHER_VIEW, Permission.TEACHER_UPDATE,
    Permission.COURSE_CREATE, Permission.COURSE_VIEW, Permission.COURSE_UPDATE, Permission.COURSE_PUBLISH,
    Permission.PAYMENT_CREATE, Permission.PAYMENT_VIEW, Permission.PAYMENT_UPDATE,
    Permission.ANALYTICS_VIEW, Permission.ANALYTICS_EXPORT,
  ],
  [UserRole.TEACHER]: [
    Permission.STUDENT_VIEW, Permission.COURSE_VIEW,
    Permission.ANALYTICS_VIEW,
  ],
  [UserRole.STUDENT]: [
    Permission.COURSE_VIEW,
  ],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    const user: User = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Authentication required');

    const userPermissions: Permission[] = ROLE_PERMISSIONS[user.role] ?? [];
    const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));

    if (!hasAll) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
