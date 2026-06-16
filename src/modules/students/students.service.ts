import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { StudentsRepository } from './students.repository';
import { UsersRepository } from '../users/users.repository';
import { UserRole, UserStatus, HomeworkStatus, AttendanceStatus } from '../../shared/enums';
import { PaginatedResult } from '../../shared/dtos/pagination.dto';
import { Student } from './entities/student.entity';
import { User } from '../users/entities/user.entity';
import { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { StudentAttendanceQueryDto } from './dto/student-attendance-query.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';
import { CourseGradesSummaryDto } from './dto/course-grades-summary.dto';
import { StudentAttendanceRecordDto } from './dto/student-attendance-record.dto';
import { StudentDetailResponseDto } from './dto/student-detail-response.dto';
import { StudentTeacherListDto, StudentTeacherItemDto } from './dto/student-teacher-item.dto';
import { paginateArray, getPaginationParams } from '../../common/utils/pagination.util';

interface EnrollDto {
  courseId: string;
  groupId?: string;
}

interface CountRow { count: string; }
interface EnrollCheckRow { id: string; }

interface AttendanceRecordRow {
  id: string;
  student_id: string;
  date: string | Date;
  status: AttendanceStatus;
  note: string | null;
  course_id: string | null;
  course_title: string | null;
  teacher_first_name: string | null;
  teacher_last_name: string | null;
}

interface GradeSubmissionRow {
  id: string;
  homework_id: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  hw_max_score: number | null;
  course_id: string | null;
  course_title: string | null;
}

interface NotificationRow {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  is_read: boolean;
  created_at: string;
}

interface TotalRow { total: string; }

interface StudentTeacherRow {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  groupName: string | null;
}

@Injectable()
export class StudentsService {
  constructor(
    private studentsRepository: StudentsRepository,
    private usersRepository: UsersRepository,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(tenantId: string, query: QueryStudentsDto): Promise<PaginatedResult<Student>> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const [data, total] = await this.studentsRepository.findWithUser(
      tenantId, page, limit, query.search, query.hasDebt, query.branch,
    );
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, tenantId: string): Promise<Student> {
    const student = await this.studentsRepository.findOne({ where: { id, tenantId }, relations: ['user'] });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  // ─── NEW: Get enriched student profile (flattened user fields + summary stats) ──

  async getDetail(id: string, tenantId: string): Promise<StudentDetailResponseDto> {
    const student = await this.findOne(id, tenantId);
    if (!student.user) throw new NotFoundException('Student user account not found');

    const [groupRows, attendanceRows, grades, courses] = await Promise.all([
      this.dataSource.query(
        `SELECT g.id as "groupId", g.name as "groupName"
         FROM group_students gs
         JOIN groups g ON g.id = gs.group_id
         WHERE gs.student_id = $1 AND g.deleted_at IS NULL
         LIMIT 1`,
        [id],
      ) as Promise<Array<{ groupId: string; groupName: string }>>,
      this.dataSource.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'present')::int AS present,
           COUNT(*) FILTER (WHERE status = 'absent')::int AS absent,
           COUNT(*) FILTER (WHERE status = 'late')::int AS late,
           COUNT(*) FILTER (WHERE status = 'excused')::int AS excused,
           COUNT(*)::int AS total
         FROM attendance WHERE student_id = $1 AND tenant_id = $2`,
        [id, tenantId],
      ) as Promise<Array<{ present: number; absent: number; late: number; excused: number; total: number }>>,
      this.getGrades(id, tenantId),
      this.getCourses(id, tenantId),
    ]);

    const att = attendanceRows[0] ?? { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    const rate = att.total > 0 ? Math.round((att.present / att.total) * 100 * 10) / 10 : 0;
    // ✅ FIX: `enrollment_date` is a `date`-typed column — TypeORM returns it as a
    // plain "YYYY-MM-DD" string (not a Date), unlike the timestamp columns below.
    const enrolledAtRaw: Date | string = student.enrollmentDate ?? student.createdAt;
    const enrolledAt = enrolledAtRaw instanceof Date ? enrolledAtRaw : new Date(enrolledAtRaw);
    const group = groupRows[0];

    return {
      id: student.id,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      email: student.user.email,
      ...(student.user.phone ? { phone: student.user.phone } : {}),
      ...(student.user.avatarUrl ? { avatarUrl: student.user.avatarUrl } : {}),
      ...(group?.groupId ? { groupId: group.groupId, groupName: group.groupName } : {}),
      balance: Number(student.balance ?? 0),
      status: student.user.status,
      tenantId: student.tenantId,
      enrolledAt: enrolledAt.toISOString(),
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      recentGrades: grades
        .flatMap((summary) => summary.grades.map((g) => ({ ...g, courseId: summary.courseId })))
        .sort((a, b) => (b.gradedAt ?? '').localeCompare(a.gradedAt ?? ''))
        .slice(0, 10)
        .map((g) => ({
          id: g.id,
          studentId: id,
          courseId: g.courseId,
          ...(g.courseName ? { courseName: g.courseName } : {}),
          ...(g.homeworkId ? { homeworkId: g.homeworkId } : {}),
          grade: g.grade,
          maxGrade: g.maxGrade,
          ...(g.feedback ? { feedback: g.feedback } : {}),
          gradedAt: g.gradedAt ?? new Date().toISOString(),
        })),
      courses,
      attendanceSummary: { present: att.present, absent: att.absent, late: att.late, excused: att.excused, rate },
    };
  }

  async create(dto: CreateStudentDto, tenantId: string, createdBy: string): Promise<Student & { user: User }> {
    const existing = await this.usersRepository.findByEmail(dto.email, tenantId);
    if (existing) throw new BadRequestException('User with this email already exists');

    const studentCode = await this.studentsRepository.getNextStudentCode(tenantId);
    const passwordHash = await bcrypt.hash((dto as CreateStudentDto & { password?: string }).password || 'Student1234!', 10);

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        tenantId,
        email: dto.email,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        createdBy,
      } as Partial<User>);
      const savedUser = await manager.save(User, user);

      const student = manager.create(Student, {
        userId: savedUser.id,
        tenantId,
        studentCode,
        parentName: dto.parentName,
        parentPhone: dto.parentPhone,
        parentEmail: dto.parentEmail,
        enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : new Date(),
        branch: dto.branch,
        notes: dto.notes,
      } as Partial<Student>);
      const savedStudent = await manager.save(Student, student);
      this.eventEmitter.emit('student.created', { student: savedStudent, tenantId });
      return { ...savedStudent, user: savedUser };
    });
  }

  async update(id: string, dto: UpdateStudentDto, tenantId: string): Promise<Student> {
    const student = await this.findOne(id, tenantId);
    const { status, firstName, lastName, email, phone, ...studentDto } = dto;

    const userUpdate: Record<string, unknown> = {};
    if (status !== undefined) userUpdate.status = status;
    if (firstName !== undefined) userUpdate.firstName = firstName;
    if (lastName !== undefined) userUpdate.lastName = lastName;
    if (email !== undefined) userUpdate.email = email;
    if (phone !== undefined) userUpdate.phone = phone;
    if (Object.keys(userUpdate).length > 0) {
      await this.usersRepository.update(student.userId, userUpdate);
    }

    if (Object.keys(studentDto).length > 0) {
      await this.studentsRepository.update(id, studentDto as any);
    }
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.studentsRepository.softDelete(id);
    this.eventEmitter.emit('student.deleted', { studentId: id, tenantId });
  }

  async getPerformance(id: string, tenantId: string): Promise<unknown> {
    await this.findOne(id, tenantId);
    return this.studentsRepository.getPerformanceSummary(id);
  }

  async getSchedule(id: string, tenantId: string): Promise<unknown[]> {
    await this.findOne(id, tenantId);
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    return this.dataSource.query(
      `SELECT sch.*, c.title as course_title, g.name as group_name
       FROM schedules sch
       JOIN enrollments e ON e.group_id = sch.group_id AND e.student_id = $1
       JOIN courses c ON c.id = sch.course_id
       JOIN groups g ON g.id = sch.group_id
       WHERE sch.tenant_id = $2 AND sch.specific_date BETWEEN $3 AND $4
       ORDER BY sch.specific_date, sch.start_time`,
      [id, tenantId, from, to],
    ) as Promise<unknown[]>;
  }

  async getPayments(id: string, tenantId: string): Promise<unknown[]> {
    await this.findOne(id, tenantId);
    return this.dataSource.query(
      `SELECT * FROM payments WHERE student_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
      [id, tenantId],
    ) as Promise<unknown[]>;
  }

  async getCertificates(id: string, tenantId: string): Promise<unknown[]> {
    await this.findOne(id, tenantId);
    return this.dataSource.query(
      `SELECT * FROM certificates WHERE student_id = $1 AND tenant_id = $2 ORDER BY issued_at DESC`,
      [id, tenantId],
    ) as Promise<unknown[]>;
  }

  async getCourses(id: string, tenantId: string): Promise<unknown[]> {
    await this.findOne(id, tenantId);
    return this.dataSource.query(
      `SELECT c.title, c.cover_url, c.status, e.progress_percent, e.enrolled_at, e.completed_at
       FROM enrollments e JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = $1 AND e.tenant_id = $2 ORDER BY e.enrolled_at DESC`,
      [id, tenantId],
    ) as Promise<unknown[]>;
  }

  /** Teachers across all groups the student is enrolled in — used for the chat contact picker. */
  async getTeachers(id: string, tenantId: string, search?: string): Promise<StudentTeacherListDto> {
    await this.findOne(id, tenantId);

    const searchPattern = search ? `%${search}%` : null;

    const rows = await this.dataSource.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (t.id)
           t.id, t.user_id as "userId", u."firstName", u."lastName",
           u.avatar_url as "avatarUrl", g.name as "groupName"
         FROM group_students gs
         JOIN groups g ON g.id = gs.group_id
         JOIN teachers t ON t.id = g.teacher_id
         JOIN users u ON u.id = t.user_id
         WHERE gs.student_id = $1 AND g.deleted_at IS NULL AND t.tenant_id = $2
           AND ($3::text IS NULL OR u."firstName" ILIKE $3 OR u."lastName" ILIKE $3)
         ORDER BY t.id, g.name
       ) sub
       ORDER BY sub."lastName", sub."firstName"`,
      [id, tenantId, searchPattern],
    ) as StudentTeacherRow[];

    const data: StudentTeacherItemDto[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      ...(r.avatarUrl ? { avatarUrl: r.avatarUrl } : {}),
      ...(r.groupName ? { groupName: r.groupName } : {}),
    }));

    return { data, total: data.length };
  }

  async enroll(id: string, dto: EnrollDto, tenantId: string): Promise<{ message: string }> {
    await this.findOne(id, tenantId);
    const existing = await this.dataSource.query(
      `SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND status = 'active'`,
      [id, dto.courseId],
    ) as EnrollCheckRow[];
    if (existing.length) throw new BadRequestException('Already enrolled');
    const totalLessons = await this.dataSource.query(
      `SELECT COUNT(*) FROM lessons WHERE course_id = $1 AND is_published = true`,
      [dto.courseId],
    ) as CountRow[];
    await this.dataSource.query(
      `INSERT INTO enrollments (student_id, course_id, group_id, tenant_id, status, enrolled_at, total_lessons, progress_percent, lessons_completed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), $5, 0, 0, NOW(), NOW())`,
      [id, dto.courseId, dto.groupId || null, tenantId, parseInt(totalLessons[0].count, 10)],
    );
    return { message: 'Enrolled successfully' };
  }

  // ─── NEW: Get student attendance ──────────────────────────────────────────

  async getAttendance(
    studentId: string,
    tenantId: string,
    query: StudentAttendanceQueryDto,
  ): Promise<StudentAttendanceRecordDto[]> {
    const student = await this.studentsRepository.findOne({ where: { id: studentId, tenantId } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    const conditions: string[] = [
      'a.student_id = $1',
      'a.tenant_id = $2',
    ];
    const params: (string | number)[] = [studentId, tenantId];
    let paramIdx = 3;

    if (query.from) {
      conditions.push(`a.date >= $${paramIdx++}`);
      params.push(query.from);
    }
    if (query.to) {
      conditions.push(`a.date <= $${paramIdx++}`);
      params.push(query.to);
    }
    if (query.groupId) {
      conditions.push(`a.group_id = $${paramIdx++}`);
      params.push(query.groupId);
    }

    const where = conditions.join(' AND ');

    const rows = await this.dataSource.query(
      `SELECT
         a.id,
         a.student_id,
         a.date,
         a.status,
         a.note,
         COALESCE(c_sch.id, c_grp.id)       AS course_id,
         COALESCE(c_sch.title, c_grp.title) AS course_title,
         u."firstName"  AS teacher_first_name,
         u."lastName"   AS teacher_last_name
       FROM attendance a
       LEFT JOIN schedules sch ON sch.id = a.schedule_id
       LEFT JOIN courses c_sch ON c_sch.id = sch.course_id
       LEFT JOIN groups g ON g.id = a.group_id
       LEFT JOIN courses c_grp ON c_grp.id = g.course_id
       LEFT JOIN teachers t ON t.id = COALESCE(sch.teacher_id, g.teacher_id)
       LEFT JOIN users u ON u.id = t.user_id
       WHERE ${where}
       ORDER BY a.date DESC`,
      params,
    ) as AttendanceRecordRow[];

    return rows.map((row) => {
      const teacherName =
        row.teacher_first_name || row.teacher_last_name
          ? `${row.teacher_first_name ?? ''} ${row.teacher_last_name ?? ''}`.trim()
          : null;

      return {
        id: row.id,
        studentId: row.student_id,
        courseId: row.course_id ?? '',
        date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
        status: row.status,
        ...(row.course_title ? { courseName: row.course_title } : {}),
        ...(teacherName ? { teacherName } : {}),
        ...(row.note ? { note: row.note } : {}),
      } as StudentAttendanceRecordDto;
    });
  }

  // ─── NEW: Get student grades, grouped by course ───────────────────────────

  async getGrades(studentId: string, tenantId: string): Promise<CourseGradesSummaryDto[]> {
    const student = await this.studentsRepository.findOne({ where: { id: studentId, tenantId } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    const submissions = await this.dataSource.query(
      `SELECT
         hs.id,
         hs.homework_id,
         hs.score,
         hs.feedback,
         hs.graded_at,
         hw.max_score AS hw_max_score,
         c.id         AS course_id,
         c.title      AS course_title
       FROM homework_submissions hs
       JOIN homeworks hw ON hw.id = hs.homework_id
       LEFT JOIN groups g ON g.id = hw.group_id
       LEFT JOIN courses c ON c.id = g.course_id
       WHERE hs.student_id = $1
         AND hw.tenant_id  = $2
         AND hs.score IS NOT NULL
       ORDER BY hs.graded_at DESC`,
      [studentId, tenantId],
    ) as GradeSubmissionRow[];

    const summaries = new Map<string, CourseGradesSummaryDto>();

    for (const sub of submissions) {
      const courseId = sub.course_id ?? 'uncategorized';
      const courseName = sub.course_title ?? 'Uncategorized';

      if (!summaries.has(courseId)) {
        summaries.set(courseId, { courseId, courseName, averageScore: 0, grades: [] });
      }

      const maxGrade = sub.hw_max_score ? Number(sub.hw_max_score) : 100;
      summaries.get(courseId)!.grades.push({
        id: sub.id,
        grade: Number(sub.score),
        maxGrade,
        homeworkId: sub.homework_id,
        courseName,
        ...(sub.graded_at ? { gradedAt: new Date(sub.graded_at).toISOString() } : {}),
        ...(sub.feedback ? { feedback: sub.feedback } : {}),
      });
    }

    for (const summary of summaries.values()) {
      const totalPercent = summary.grades.reduce(
        (sum, g) => sum + (g.maxGrade > 0 ? (g.grade / g.maxGrade) * 100 : 0),
        0,
      );
      summary.averageScore =
        summary.grades.length > 0 ? Math.round((totalPercent / summary.grades.length) * 10) / 10 : 0;
    }

    return Array.from(summaries.values());
  }

  // ─── NEW: Get student notifications (paginated) ───────────────────────────

  async getNotifications(
    studentId: string,
    tenantId: string,
    query: { page?: number; limit?: number; unread?: boolean },
  ): Promise<PaginatedResult<NotificationRow>> {
    const student = await this.studentsRepository.findOne({
      where: { id: studentId, tenantId },
      relations: ['user'],
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    if (!student.user) throw new NotFoundException('Student user account not found');

    const { page, limit, skip } = getPaginationParams(query);
    const userId = student.user.id;

    const conditions: string[] = ['n.user_id = $1', 'n.tenant_id = $2'];
    const params: (string | boolean | number)[] = [userId, tenantId];
    let paramIdx = 3;

    if (query.unread === true || String(query.unread) === 'true') {
      conditions.push(`n.is_read = false`);
    }

    const where = conditions.join(' AND ');

    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT n.* FROM notifications n WHERE ${where} ORDER BY n.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, skip],
      ) as Promise<NotificationRow[]>,
      this.dataSource.query(
        `SELECT COUNT(*)::int as total FROM notifications n WHERE ${where}`,
        params,
      ) as Promise<TotalRow[]>,
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return paginateArray(rows, total, page, limit);
  }

  // ─── NEW: Submit homework ─────────────────────────────────────────────────

  async submitHomework(
    studentId: string,
    homeworkId: string,
    tenantId: string,
    dto: SubmitHomeworkDto,
    userId: string,
  ): Promise<unknown> {
    const student = await this.studentsRepository.findOne({
      where: { id: studentId, tenantId },
      relations: ['user'],
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    if (student.user?.id !== userId) {
      throw new ForbiddenException('You can only submit homework for yourself');
    }

    const homeworkRows = await this.dataSource.query(
      `SELECT id FROM homeworks WHERE id = $1 AND tenant_id = $2`,
      [homeworkId, tenantId],
    ) as Array<{ id: string }>;
    if (!homeworkRows.length) throw new NotFoundException(`Homework ${homeworkId} not found`);

    const existingRows = await this.dataSource.query(
      `SELECT id FROM homework_submissions WHERE homework_id = $1 AND student_id = $2`,
      [homeworkId, studentId],
    ) as Array<{ id: string }>;
    if (existingRows.length) throw new ConflictException('Homework already submitted');

    const attachments = dto.attachments ?? [];
    const result = await this.dataSource.query(
      `INSERT INTO homework_submissions
         (homework_id, student_id, tenant_id, content, attachments, status, submitted_at, is_late, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW(), false, NOW(), NOW())
       RETURNING *`,
      [
        homeworkId,
        studentId,
        tenantId,
        dto.content,
        JSON.stringify(attachments),
        HomeworkStatus.SUBMITTED,
      ],
    ) as unknown[];

    return result[0];
  }
}
