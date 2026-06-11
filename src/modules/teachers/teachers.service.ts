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

interface GroupRow { id: string; }
interface StudentRow { id: string; first_name: string; last_name: string; }
interface AttendanceCountRow { total: string; present_count: string; }
interface MonthAttendanceRow { total: string; present_count: string; }
interface SubmissionRow { score: number | null; homework_id: string; }
interface HomeworkCountRow { assigned: string; graded: string; pending: string; }

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
    const { status, ...teacherDto } = dto;
    if (status !== undefined) {
      await this.usersRepository.update(teacher.userId, { status });
    }
    if (Object.keys(teacherDto).length > 0) {
      await this.teachersRepository.update(id, teacherDto);
    }
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.teachersRepository.softDelete(id);
  }

  async getGroups(id: string, tenantId: string): Promise<any[]> {
    await this.findOne(id, tenantId);
    return this.dataSource.query(
      `SELECT g.*, c.title as course_title, COUNT(e.id) as student_count
       FROM groups g LEFT JOIN courses c ON c.id = g.course_id
       LEFT JOIN enrollments e ON e.group_id = g.id AND e.status = 'active'
       WHERE g.teacher_id = $1 AND g.tenant_id = $2 AND g.deleted_at IS NULL
       GROUP BY g.id, c.title ORDER BY g.created_at DESC`,
      [id, tenantId],
    );
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

  async getStudents(id: string, tenantId: string): Promise<any[]> {
    await this.findOne(id, tenantId);
    return this.dataSource.query(
      `SELECT DISTINCT u.first_name, u.last_name, u.email, s.student_code, g.name as group_name
       FROM enrollments e JOIN students s ON s.id = e.student_id JOIN users u ON u.id = s.user_id
       JOIN groups g ON g.id = e.group_id
       WHERE g.teacher_id = $1 AND e.tenant_id = $2 AND e.status = 'active'
       ORDER BY u.last_name`,
      [id, tenantId],
    );
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
      `SELECT DISTINCT e.student_id as id, u.first_name, u.last_name
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN users u ON u.id = s.user_id
       WHERE e.group_id = ANY($1::uuid[]) AND e.tenant_id = $2`,
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
         JOIN homework_submissions hs ON hs.homework_id = hw.id AND hs.student_id = $1
         LEFT JOIN attendance att ON att.student_id = $1 AND att.marked_by = $2 AND att.tenant_id = $3
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
        name: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
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
}
