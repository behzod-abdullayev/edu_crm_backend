import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { Teacher } from './entities/teacher.entity';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeachersDto } from './dto/query-teachers.dto';
import { TeachersRepository } from './teachers.repository';
import { UsersRepository } from '../users/users.repository';
import { UserRole, UserStatus } from '../../shared/enums';
import { PaginatedResult } from '../../shared/dtos/pagination.dto';
import {
  TeacherAnalyticsDto,
  AttendanceByMonthDto,
  StudentPerformanceItemDto,
} from './dto/teacher-analytics.dto';
import { AttendanceSheetEntryDto } from './dto/attendance-sheet-entry.dto';
import { MarkGroupAttendanceDto } from './dto/mark-group-attendance.dto';
import { AttendanceStatus } from '../../shared/enums';
import { TeacherHomeworkItemDto, TeacherHomeworkListDto } from './dto/teacher-homework-item.dto';
import { TeacherLessonItemDto, TeacherLessonListDto } from './dto/teacher-lesson-item.dto';
import { TeacherStudentItemDto, TeacherStudentListDto } from './dto/teacher-student-item.dto';

interface GroupRow { id: string; }
interface GroupListRow {
  id: string;
  name: string;
  description: string | null;
  tenantId: string;
  teacherId: string;
  createdAt: Date;
  isActive: boolean;
  courseName: string | null;
  studentCount: string;
}
interface StudentRow { id: string; firstName: string; lastName: string; }
interface AttendanceSheetRow {
  studentId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: string | null;
  note: string | null;
}
interface GroupOwnershipRow { id: string; }
interface ExistingAttendanceRow { id: string; }
interface AttendanceCountRow { total: string; present_count: string; }
interface MonthAttendanceRow { total: string; present_count: string; }
interface SubmissionRow { score: number | null; homework_id: string; }
interface TeacherHomeworkRow {
  id: string;
  title: string;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
  courseId: string | null;
  courseName: string | null;
  teacherId: string;
  dueDate: Date | null;
  maxScore: string;
  attachments: Array<{ name: string; url: string; type: string }> | null;
  createdAt: Date;
  updatedAt: Date;
}
interface HomeworkSubmissionCountRow { homeworkId: string; total: string; graded: string; }
interface HomeworkCountRow { assigned: string; graded: string; pending: string; }
interface TeacherStudentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  groupName: string | null;
}
interface StudentPerfRow { avg_score: number | null; att_total: number; att_present: number; }
interface TeacherGroupCourseRow { id: string; name: string; courseId: string; }
interface TeacherLessonRow {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  type: string;
  videoUrl: string | null;
  fileUrl: string | null;
  order: number;
  durationMinutes: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TeachersService {
  constructor(
    private teachersRepository: TeachersRepository,
    private usersRepository: UsersRepository,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(tenantId: string, query: QueryTeachersDto): Promise<PaginatedResult<Teacher>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [data, total] = await this.teachersRepository.findWithUser(
      tenantId,
      Number(page),
      Number(limit),
      query.search as string | undefined,
    );
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const teacher = await this.teachersRepository.findOne({ where: { id, tenantId }, relations: ['user'] });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async create(dto: CreateTeacherDto, tenantId: string, createdBy: string): Promise<Teacher> {
    const existing = await this.usersRepository.findByEmail(dto.email, tenantId);
    if (existing) throw new BadRequestException('User with this email already exists');

    const teacherCode = await this.teachersRepository.getNextTeacherCode(tenantId);
    const passwordHash = await bcrypt.hash(dto.password || 'Teacher1234!', 10);

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create('User' as any, {
        tenantId, email: dto.email, phone: dto.phone,
        firstName: dto.firstName, lastName: dto.lastName,
        password: passwordHash, role: UserRole.TEACHER,
        status: UserStatus.ACTIVE, createdBy,
      });
      const savedUser = await manager.save('User', user) as any;

      const teacher = manager.create('Teacher' as any, {
        userId: savedUser.id, tenantId, teacherCode,
        specialization: dto.specialization,
        qualifications: dto.qualifications,
        salary: dto.salary, salaryType: dto.salaryType,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        branch: dto.branch, isActive: true,
      });
      const savedTeacher = await manager.save('Teacher', teacher) as any;
      this.eventEmitter.emit('teacher.created', { teacher: savedTeacher, tenantId });
      return { ...(savedTeacher as any), user: savedUser };
    });
  }

  async update(id: string, dto: UpdateTeacherDto, tenantId: string): Promise<Teacher> {
    const teacher = await this.findOne(id, tenantId);
    const {
      status, firstName, lastName, middleName, email, phone,
      gender, language, dateOfBirth, address, city, timezone,
      specialization, subjects, bio, experienceYears, hireDate,
      salary, salaryCurrency, paymentType, maxStudents, branch,
      ...rest
    } = dto;
    void rest;

    const userUpdate: Record<string, unknown> = {};
    if (status !== undefined) userUpdate.status = status;
    if (firstName !== undefined) userUpdate.firstName = firstName;
    if (lastName !== undefined) userUpdate.lastName = lastName;
    if (middleName !== undefined) userUpdate.middleName = middleName;
    if (email !== undefined) userUpdate.email = email;
    if (phone !== undefined) userUpdate.phone = phone;
    if (gender !== undefined) userUpdate.gender = gender;
    if (language !== undefined) userUpdate.language = language;
    if (dateOfBirth !== undefined) userUpdate.dateOfBirth = dateOfBirth;
    if (address !== undefined) userUpdate.address = address;
    if (city !== undefined) userUpdate.city = city;
    if (timezone !== undefined) userUpdate.timezone = timezone;
    if (Object.keys(userUpdate).length > 0) {
      await this.usersRepository.update(teacher.userId, userUpdate);
    }

    const teacherUpdate: Record<string, unknown> = {};
    if (specialization !== undefined) teacherUpdate.specialization = specialization;
    if (subjects !== undefined) teacherUpdate.subjects = subjects;
    if (bio !== undefined) teacherUpdate.bio = bio;
    if (experienceYears !== undefined) teacherUpdate.experienceYears = experienceYears;
    if (hireDate !== undefined) teacherUpdate.hireDate = new Date(hireDate);
    if (salary !== undefined) teacherUpdate.salary = salary;
    if (salaryCurrency !== undefined) teacherUpdate.salaryCurrency = salaryCurrency;
    if (paymentType !== undefined) teacherUpdate.paymentType = paymentType;
    if (maxStudents !== undefined) teacherUpdate.maxStudents = maxStudents;
    if (branch !== undefined) teacherUpdate.branch = branch;
    if (Object.keys(teacherUpdate).length > 0) {
      await this.teachersRepository.update(id, teacherUpdate);
    }

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.teachersRepository.softDelete(id);
  }

  async getGroups(id: string, tenantId: string): Promise<any[]> {
    const teacher = await this.findOne(id, tenantId);
    const teacherName = teacher.user ? `${teacher.user.firstName} ${teacher.user.lastName}` : undefined;

    const rows = await this.dataSource.query(
      `SELECT g.id, g.name, g.description,
              g.tenant_id as "tenantId", g.teacher_id as "teacherId",
              g.created_at as "createdAt", g.is_active as "isActive",
              c.title as "courseName",
              COUNT(gs.student_id)::int as "studentCount"
       FROM groups g
       LEFT JOIN courses c ON c.id = g.course_id
       LEFT JOIN group_students gs ON gs.group_id = g.id
       WHERE g.teacher_id = $1 AND g.tenant_id = $2 AND g.deleted_at IS NULL
       GROUP BY g.id, g.name, g.description, g.tenant_id, g.teacher_id, g.created_at, g.is_active, c.title
       ORDER BY g.created_at DESC`,
      [id, tenantId],
    ) as GroupListRow[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      teacherId: r.teacherId,
      teacherName,
      studentCount: Number(r.studentCount),
      courseCount: r.courseName ? 1 : 0,
      tenantId: r.tenantId,
      createdAt: new Date(r.createdAt).toISOString(),
      courseName: r.courseName ?? undefined,
      status: r.isActive ? 'active' : 'inactive',
    }));
  }

  async getSchedule(id: string, tenantId: string): Promise<any[]> {
    await this.findOne(id, tenantId);
    const from = new Date();
    const to = new Date(); to.setDate(to.getDate() + 7);
    return this.dataSource.query(
      `SELECT s.*, g.name as group_name, c.title as course_title
       FROM schedules s LEFT JOIN groups g ON g.id = s.group_id LEFT JOIN courses c ON c.id = s.course_id
       WHERE s.teacher_id = $1 AND s.tenant_id = $2 AND s.date BETWEEN $3 AND $4
       ORDER BY s.date, s.start_time`,
      [id, tenantId, from, to],
    );
  }

  async getStudents(
    id: string,
    tenantId: string,
    search: string | undefined,
    page: number,
    limit: number,
  ): Promise<TeacherStudentListDto> {
    await this.findOne(id, tenantId);

    const offset = (page - 1) * limit;
    const searchPattern = search ? `%${search}%` : null;

    const countRows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT s.id)::int as total
       FROM group_students gs
       JOIN students s ON s.id = gs.student_id
       JOIN users u ON u.id = s.user_id
       JOIN groups g ON g.id = gs.group_id
       WHERE g.teacher_id = $1 AND s.tenant_id = $2 AND g.deleted_at IS NULL
         AND ($3::text IS NULL OR u."firstName" ILIKE $3 OR u."lastName" ILIKE $3 OR u.email ILIKE $3 OR s.student_code ILIKE $3)`,
      [id, tenantId, searchPattern],
    ) as Array<{ total: number }>;
    const total = countRows[0]?.total ?? 0;

    const rows = await this.dataSource.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (s.id)
           s.id, u."firstName", u."lastName", u.email, u.phone,
           u.avatar_url as "avatarUrl", u.status, g.name as "groupName"
         FROM group_students gs
         JOIN students s ON s.id = gs.student_id
         JOIN users u ON u.id = s.user_id
         JOIN groups g ON g.id = gs.group_id
         WHERE g.teacher_id = $1 AND s.tenant_id = $2 AND g.deleted_at IS NULL
           AND ($3::text IS NULL OR u."firstName" ILIKE $3 OR u."lastName" ILIKE $3 OR u.email ILIKE $3 OR s.student_code ILIKE $3)
         ORDER BY s.id, g.name
       ) sub
       ORDER BY sub."lastName", sub."firstName"
       LIMIT $4 OFFSET $5`,
      [id, tenantId, searchPattern, limit, offset],
    ) as TeacherStudentRow[];

    const data: TeacherStudentItemDto[] = [];
    for (const r of rows) {
      const perfRows = await this.dataSource.query(
        `SELECT
           AVG(hs.score::numeric) AS avg_score,
           COUNT(att.id)::int AS att_total,
           COUNT(att.id) FILTER (WHERE att.status = 'present')::int AS att_present
         FROM homeworks hw
         JOIN homework_submissions hs ON hs.homework_id = hw.id AND hs.student_id = $1::text
         LEFT JOIN attendance att ON att.student_id = $1::uuid AND att.marked_by = $2 AND att.tenant_id = $3
         WHERE hw.teacher_id = $2 AND hw.tenant_id = $3`,
        [r.id, id, tenantId],
      ) as StudentPerfRow[];

      const perf = perfRows[0];
      const attTotal = Number(perf?.att_total ?? 0);
      const attPresent = Number(perf?.att_present ?? 0);

      data.push({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        ...(r.phone ? { phone: r.phone } : {}),
        ...(r.avatarUrl ? { avatarUrl: r.avatarUrl } : {}),
        status: r.status,
        ...(r.groupName ? { groupName: r.groupName } : {}),
        attendanceRate: attTotal > 0 ? Math.round((attPresent / attTotal) * 100 * 10) / 10 : 0,
        averageGrade:
          perf?.avg_score !== null && perf?.avg_score !== undefined
            ? Math.round(Number(perf.avg_score) * 10) / 10
            : 0,
      });
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  async getStats(id: string, tenantId: string): Promise<any> {
    await this.findOne(id, tenantId);
    return this.teachersRepository.getStats(id);
  }

  // ─── NEW: Teacher analytics ───────────────────────────────────────────────

  async getAnalytics(teacherId: string, tenantId: string): Promise<TeacherAnalyticsDto> {
    await this.findOne(teacherId, tenantId);

    // Groups taught by teacher
    const groups = await this.dataSource.query(
      `SELECT id FROM groups WHERE teacher_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [teacherId, tenantId],
    ) as GroupRow[];

    const totalGroups = groups.length;

    // Unique students
    const uniqueStudentsRows = await this.dataSource.query(
      `SELECT DISTINCT gs.student_id as id, u."firstName", u."lastName"
       FROM group_students gs
       JOIN students s ON s.id = gs.student_id
       JOIN users u ON u.id = s.user_id
       WHERE gs.group_id = ANY($1::uuid[]) AND s.tenant_id = $2`,
      [groups.map((g) => g.id), tenantId],
    ) as StudentRow[];

    const totalStudents = uniqueStudentsRows.length;

    // Attendance last 30 days for teacher's attendances
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceSummary = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'present')::int AS present_count
       FROM attendance
       WHERE marked_by = $1
         AND tenant_id = $2
         AND date >= $3`,
      [teacherId, tenantId, thirtyDaysAgo],
    ) as AttendanceCountRow[];

    const attTotal = Number(attendanceSummary[0]?.total ?? 0);
    const attPresent = Number(attendanceSummary[0]?.present_count ?? 0);
    const avgAttendanceRate =
      attTotal > 0 ? Math.round((attPresent / attTotal) * 100 * 10) / 10 : 0;

    // Homework stats
    const hwStats = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS assigned,
         COUNT(*) FILTER (WHERE hs.score IS NOT NULL)::int AS graded,
         COUNT(*) FILTER (WHERE hs.score IS NULL AND hs.submitted_at IS NOT NULL)::int AS pending
       FROM homeworks hw
       LEFT JOIN homework_submissions hs ON hs.homework_id = hw.id
       WHERE hw.teacher_id = $1 AND hw.tenant_id = $2`,
      [teacherId, tenantId],
    ) as HomeworkCountRow[];

    const assigned = Number(hwStats[0]?.assigned ?? 0);
    const graded = Number(hwStats[0]?.graded ?? 0);
    const pending = Number(hwStats[0]?.pending ?? 0);

    // Average homework score
    const avgScoreRows = await this.dataSource.query(
      `SELECT AVG(hs.score::numeric) AS avg_score
       FROM homework_submissions hs
       JOIN homeworks hw ON hw.id = hs.homework_id
       WHERE hw.teacher_id = $1 AND hw.tenant_id = $2 AND hs.score IS NOT NULL`,
      [teacherId, tenantId],
    ) as Array<{ avg_score: number | null }>;

    const avgHomeworkScore =
      avgScoreRows[0]?.avg_score !== null && avgScoreRows[0]?.avg_score !== undefined
        ? Math.round(Number(avgScoreRows[0].avg_score) * 10) / 10
        : 0;

    // Attendance by month (last 6 months)
    const attendanceByMonth: AttendanceByMonthDto[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      const monthRows = await this.dataSource.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'present')::int AS present_count
         FROM attendance
         WHERE marked_by = $1
           AND tenant_id = $2
           AND EXTRACT(YEAR FROM date) = $3
           AND EXTRACT(MONTH FROM date) = $4`,
        [teacherId, tenantId, year, month],
      ) as MonthAttendanceRow[];

      const mTotal = Number(monthRows[0]?.total ?? 0);
      const mPresent = Number(monthRows[0]?.present_count ?? 0);
      const rate = mTotal > 0 ? Math.round((mPresent / mTotal) * 100 * 10) / 10 : 0;
      attendanceByMonth.push({ month: monthKey, rate });
    }

    // Student performance (top 20)
    const studentPerformance: StudentPerformanceItemDto[] = [];
    for (const student of uniqueStudentsRows.slice(0, 20)) {
      const perfRows = await this.dataSource.query(
        `SELECT
           AVG(hs.score::numeric) AS avg_score,
           COUNT(att.id)::int AS att_total,
           COUNT(att.id) FILTER (WHERE att.status = 'present')::int AS att_present
         FROM homeworks hw
         JOIN homework_submissions hs ON hs.homework_id = hw.id AND hs.student_id = $1::text
         LEFT JOIN attendance att ON att.student_id = $1::uuid AND att.marked_by = $2 AND att.tenant_id = $3
         WHERE hw.teacher_id = $2 AND hw.tenant_id = $3`,
        [student.id, teacherId, tenantId],
      ) as Array<{ avg_score: number | null; att_total: number; att_present: number }>;

      const row = perfRows[0];
      const avgScore =
        row?.avg_score !== null && row?.avg_score !== undefined
          ? Math.round(Number(row.avg_score) * 10) / 10
          : 0;
      const attTotal = Number(row?.att_total ?? 0);
      const attPres = Number(row?.att_present ?? 0);
      const attendanceRate =
        attTotal > 0 ? Math.round((attPres / attTotal) * 100 * 10) / 10 : 0;

      studentPerformance.push({
        studentId: student.id,
        name: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
        avgScore,
        attendanceRate,
      });
    }

    return {
      totalStudents,
      totalGroups,
      avgAttendanceRate,
      avgHomeworkScore,
      homeworkStats: { assigned, graded, pending },
      attendanceByMonth,
      studentPerformance,
    };
  }

  // ─── NEW: Attendance marking ──────────────────────────────────────────────

  async getAttendanceSheet(
    teacherId: string,
    groupId: string,
    tenantId: string,
    date: string,
  ): Promise<AttendanceSheetEntryDto[]> {
    await this.findOne(teacherId, tenantId);
    await this.assertOwnsGroup(teacherId, groupId, tenantId);

    const rows = await this.dataSource.query(
      `SELECT gs.student_id as "studentId",
              u."firstName" as "firstName", u."lastName" as "lastName",
              u.avatar_url as "avatarUrl",
              a.status as "status", a.note as "note"
       FROM group_students gs
       JOIN students s ON s.id = gs.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN attendance a ON a.student_id = gs.student_id
         AND a.group_id = gs.group_id
         AND a.date = $3::date
         AND a.tenant_id = $2
       WHERE gs.group_id = $1 AND s.tenant_id = $2
       ORDER BY u."lastName"`,
      [groupId, tenantId, date],
    ) as AttendanceSheetRow[];

    return rows.map((r) => ({
      studentId: r.studentId,
      studentName: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
      ...(r.avatarUrl ? { avatarUrl: r.avatarUrl } : {}),
      status: r.status ?? AttendanceStatus.PRESENT,
      ...(r.note ? { note: r.note } : {}),
    }));
  }

  async markAttendance(
    teacherId: string,
    tenantId: string,
    dto: MarkGroupAttendanceDto,
  ): Promise<{ marked: number }> {
    await this.findOne(teacherId, tenantId);
    await this.assertOwnsGroup(teacherId, dto.groupId, tenantId);

    await this.dataSource.transaction(async (manager) => {
      for (const entry of dto.entries) {
        const existing = await manager.query(
          `SELECT id FROM attendance
           WHERE student_id = $1 AND group_id = $2 AND date = $3::date AND tenant_id = $4`,
          [entry.studentId, dto.groupId, dto.date, tenantId],
        ) as ExistingAttendanceRow[];

        if (existing.length > 0) {
          await manager.query(
            `UPDATE attendance SET status = $1, note = $2, marked_by = $3, updated_at = now()
             WHERE id = $4`,
            [entry.status, entry.note ?? null, teacherId, existing[0].id],
          );
        } else {
          await manager.query(
            `INSERT INTO attendance (tenant_id, student_id, group_id, marked_by, status, date, note)
             VALUES ($1, $2, $3, $4, $5, $6::date, $7)`,
            [tenantId, entry.studentId, dto.groupId, teacherId, entry.status, dto.date, entry.note ?? null],
          );
        }
      }
    });

    return { marked: dto.entries.length };
  }

  // ─── NEW: Homework list ────────────────────────────────────────────────────

  async getHomework(
    teacherId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<TeacherHomeworkListDto> {
    await this.findOne(teacherId, tenantId);

    const offset = (page - 1) * limit;

    const countRows = await this.dataSource.query(
      `SELECT COUNT(*)::int as total FROM homeworks
       WHERE teacher_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [teacherId, tenantId],
    ) as Array<{ total: number }>;
    const total = countRows[0]?.total ?? 0;

    const rows = await this.dataSource.query(
      `SELECT hw.id, hw.title, hw.description,
              hw.group_id as "groupId", g.name as "groupName",
              g.course_id as "courseId", c.title as "courseName",
              hw.teacher_id as "teacherId", hw.due_date as "dueDate",
              hw.max_score as "maxScore", hw.attachments,
              hw.created_at as "createdAt", hw.updated_at as "updatedAt"
       FROM homeworks hw
       LEFT JOIN groups g ON g.id = hw.group_id
       LEFT JOIN courses c ON c.id = g.course_id
       WHERE hw.teacher_id = $1 AND hw.tenant_id = $2 AND hw.deleted_at IS NULL
       ORDER BY hw.created_at DESC
       LIMIT $3 OFFSET $4`,
      [teacherId, tenantId, limit, offset],
    ) as TeacherHomeworkRow[];

    const homeworkIds = rows.map((r) => r.id);
    const countsByHomework = new Map<string, { total: number; graded: number }>();
    if (homeworkIds.length > 0) {
      const countRows2 = await this.dataSource.query(
        `SELECT homework_id as "homeworkId",
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE status = 'graded')::int as graded
         FROM homework_submissions
         WHERE homework_id = ANY($1::uuid[]) AND tenant_id = $2
         GROUP BY homework_id`,
        [homeworkIds, tenantId],
      ) as HomeworkSubmissionCountRow[];
      for (const r of countRows2) {
        countsByHomework.set(r.homeworkId, { total: Number(r.total), graded: Number(r.graded) });
      }
    }

    const now = new Date();
    const data: TeacherHomeworkItemDto[] = rows.map((r) => {
      const counts = countsByHomework.get(r.id) ?? { total: 0, graded: 0 };
      const dueDate = r.dueDate ? new Date(r.dueDate) : null;
      return {
        id: r.id,
        title: r.title,
        ...(r.description ? { description: r.description } : {}),
        groupId: r.groupId ?? '',
        ...(r.groupName ? { groupName: r.groupName } : {}),
        ...(r.courseId ? { courseId: r.courseId } : {}),
        ...(r.courseName ? { courseName: r.courseName } : {}),
        teacherId: r.teacherId,
        ...(dueDate ? { dueDate: dueDate.toISOString() } : {}),
        maxPoints: Number(r.maxScore),
        allowResubmit: false,
        ...(r.attachments?.length ? { attachedFileKeys: r.attachments.map((a) => a.url) } : {}),
        submissionsCount: counts.total,
        submissionCount: counts.total,
        gradedCount: counts.graded,
        status: dueDate && dueDate < now ? 'closed' : 'published',
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  // ─── NEW: Lessons list ──────────────────────────────────────────────────────

  async getLessons(
    teacherId: string,
    tenantId: string,
    groupId: string | undefined,
    page: number,
    limit: number,
  ): Promise<TeacherLessonListDto> {
    await this.findOne(teacherId, tenantId);

    const groupRows = await this.dataSource.query(
      `SELECT g.id, g.name, g.course_id as "courseId"
       FROM groups g
       WHERE g.teacher_id = $1 AND g.tenant_id = $2 AND g.deleted_at IS NULL AND g.course_id IS NOT NULL`,
      [teacherId, tenantId],
    ) as TeacherGroupCourseRow[];

    const relevantGroups = groupId ? groupRows.filter((g) => g.id === groupId) : groupRows;

    const courseToGroup = new Map<string, { groupId: string; groupName: string }>();
    for (const g of relevantGroups) {
      if (!courseToGroup.has(g.courseId)) {
        courseToGroup.set(g.courseId, { groupId: g.id, groupName: g.name });
      }
    }

    const courseIds = [...courseToGroup.keys()];
    if (courseIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const offset = (page - 1) * limit;

    const countRows = await this.dataSource.query(
      `SELECT COUNT(*)::int as total FROM lessons
       WHERE course_id = ANY($1::uuid[]) AND tenant_id = $2 AND deleted_at IS NULL`,
      [courseIds, tenantId],
    ) as Array<{ total: number }>;
    const total = countRows[0]?.total ?? 0;

    const rows = await this.dataSource.query(
      `SELECT l.id, l.title, l.content as description, l.course_id as "courseId",
              l.type, l.video_url as "videoUrl", l.file_url as "fileUrl",
              l.sort_order as "order", l.duration_minutes as "durationMinutes",
              l.is_published as "isPublished",
              l.created_at as "createdAt", l.updated_at as "updatedAt"
       FROM lessons l
       WHERE l.course_id = ANY($1::uuid[]) AND l.tenant_id = $2 AND l.deleted_at IS NULL
       ORDER BY l.created_at DESC
       LIMIT $3 OFFSET $4`,
      [courseIds, tenantId, limit, offset],
    ) as TeacherLessonRow[];

    const data: TeacherLessonItemDto[] = rows.map((r) => {
      const group = courseToGroup.get(r.courseId);
      return {
        id: r.id,
        title: r.title,
        ...(r.description ? { description: r.description } : {}),
        courseId: r.courseId,
        ...(group ? { groupId: group.groupId, groupName: group.groupName } : {}),
        type: r.type,
        ...(r.videoUrl ? { videoUrl: r.videoUrl } : {}),
        ...(r.fileUrl ? { fileUrl: r.fileUrl } : {}),
        order: Number(r.order),
        durationMinutes: Number(r.durationMinutes),
        isPublished: r.isPublished,
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  private async assertOwnsGroup(teacherId: string, groupId: string, tenantId: string): Promise<void> {
    const group = await this.dataSource.query(
      `SELECT id FROM groups WHERE id = $1 AND teacher_id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [groupId, teacherId, tenantId],
    ) as GroupOwnershipRow[];
    if (group.length === 0) throw new NotFoundException('Group not found');
  }
}
