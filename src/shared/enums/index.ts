export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  BLOCKED = 'blocked',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum Language {
  UZBEK = 'uz',
  RUSSIAN = 'ru',
  ENGLISH = 'en',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  PUSH = 'push',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  READ = 'read',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  PAYME = 'payme',
  CLICK = 'click',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum LessonType {
  VIDEO = 'video',
  TEXT = 'text',
  QUIZ = 'quiz',
  LIVE = 'live',
  ASSIGNMENT = 'assignment',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
}

export enum HomeworkStatus {
  ASSIGNED = 'assigned',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  LATE = 'late',
  MISSING = 'missing',
}

export enum ExamType {
  QUIZ = 'quiz',
  MIDTERM = 'midterm',
  FINAL = 'final',
  PRACTICE = 'practice',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  FILL_BLANK = 'fill_blank',
}

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  GCS = 'gcs',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  ROLE_CHANGE = 'role_change',
  PERMISSION_CHANGE = 'permission_change',
  EXPORT = 'export',
  IMPORT = 'import',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum ChatMessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system',
}

export enum Permission {
  // ── User management ───────────────────────────────────────────────────────
  USER_VIEW    = 'user.view',
  USER_CREATE  = 'user.create',
  USER_UPDATE  = 'user.update',
  USER_DELETE  = 'user.delete',

  // ── Student management ────────────────────────────────────────────────────
  STUDENT_VIEW   = 'student.view',
  STUDENT_CREATE = 'student.create',
  STUDENT_UPDATE = 'student.update',
  STUDENT_DELETE = 'student.delete',

  // ── Teacher management ────────────────────────────────────────────────────
  TEACHER_VIEW   = 'teacher.view',
  TEACHER_CREATE = 'teacher.create',
  TEACHER_UPDATE = 'teacher.update',
  TEACHER_DELETE = 'teacher.delete',

  // ── Course management ─────────────────────────────────────────────────────
  COURSE_VIEW    = 'course.view',
  COURSE_CREATE  = 'course.create',
  COURSE_UPDATE  = 'course.update',
  COURSE_DELETE  = 'course.delete',
  COURSE_PUBLISH = 'course.publish',

  // ── Payment management ────────────────────────────────────────────────────
  PAYMENT_VIEW   = 'payment.view',
  PAYMENT_CREATE = 'payment.create',
  PAYMENT_UPDATE = 'payment.update',
  PAYMENT_REFUND = 'payment.refund',
  PAYMENT_MANAGE = 'payment.manage',

  // ── Attendance ────────────────────────────────────────────────────────────
  ATTENDANCE_VIEW   = 'attendance.view',
  ATTENDANCE_MANAGE = 'attendance.manage',

  // ── Schedule ──────────────────────────────────────────────────────────────
  SCHEDULE_VIEW   = 'schedule.view',
  SCHEDULE_MANAGE = 'schedule.manage',

  // ── Groups ────────────────────────────────────────────────────────────────
  GROUP_VIEW   = 'group.view',
  GROUP_MANAGE = 'group.manage',

  // ── Homework ──────────────────────────────────────────────────────────────
  HOMEWORK_CREATE = 'homework.create',
  HOMEWORK_GRADE  = 'homework.grade',
  HOMEWORK_SUBMIT = 'homework.submit',
  HOMEWORK_VIEW   = 'homework.view',

  // ── Exams ─────────────────────────────────────────────────────────────────
  EXAM_CREATE      = 'exam.create',
  EXAM_PARTICIPATE = 'exam.participate',
  EXAM_VIEW        = 'exam.view',

  // ── Grades ────────────────────────────────────────────────────────────────
  GRADE_VIEW = 'grade.view',

  // ── Certificates ──────────────────────────────────────────────────────────
  CERTIFICATE_VIEW   = 'certificate.view',
  CERTIFICATE_ISSUE  = 'certificate.issue',
  CERTIFICATE_REVOKE = 'certificate.revoke',

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFICATION_VIEW = 'notification.view',
  NOTIFICATION_SEND = 'notification.send',

  // ── Chat ──────────────────────────────────────────────────────────────────
  CHAT_USE = 'chat.use',

  // ── Lessons ───────────────────────────────────────────────────────────────
  LESSON_VIEW   = 'lesson.view',
  LESSON_CREATE = 'lesson.create',
  LESSON_UPLOAD = 'lesson.upload',

  // ── Analytics ─────────────────────────────────────────────────────────────
  ANALYTICS_VIEW   = 'analytics.view',
  ANALYTICS_EXPORT = 'analytics.export',

  // ── Reports ───────────────────────────────────────────────────────────────
  REPORT_VIEW = 'report.view',

  // ── System configuration ──────────────────────────────────────────────────
  CONFIG_READ   = 'config.read',
  CONFIG_UPDATE = 'config.update',

  // ── Audit ─────────────────────────────────────────────────────────────────
  AUDIT_READ = 'audit.read',

  // ── Role management ───────────────────────────────────────────────────────
  ROLE_CREATE = 'role.create',
  ROLE_READ   = 'role.read',
  ROLE_UPDATE = 'role.update',
  ROLE_DELETE = 'role.delete',
  ROLE_ASSIGN = 'role.assign',
}
