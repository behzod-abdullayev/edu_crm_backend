import { UserRole } from '../../shared/enums';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.OWNER]: ['*'],
  [UserRole.ADMIN]: [
    'student.view', 'student.create', 'student.update', 'student.delete',
    'teacher.view', 'teacher.create', 'teacher.update', 'teacher.delete',
    'course.view', 'course.create', 'course.update', 'course.delete',
    'payment.view', 'payment.create', 'payment.manage',
    'attendance.view', 'attendance.manage',
    'schedule.view', 'schedule.manage',
    'report.view', 'analytics.view',
    'notification.send', 'group.view', 'group.manage',
  ],
  [UserRole.TEACHER]: [
    'student.view', 'course.view', 'group.view',
    'attendance.view', 'attendance.manage',
    'homework.create', 'homework.grade',
    'exam.create', 'analytics.view',
    'schedule.view', 'chat.use',
    'lesson.upload',
  ],
  [UserRole.STUDENT]: [
    'course.view', 'schedule.view',
    'homework.submit', 'exam.participate',
    'grade.view', 'certificate.view',
    'notification.view', 'chat.use',
    'attendance.view',
  ],
};

export function getPermissionsForRole(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
