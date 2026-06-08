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
import { UserRole, UserStatus, HomeworkStatus } from '../../shared/enums';
import { PaginatedResult } from '../../shared/dtos/pagination.dto';
import { Student } from './entities/student.entity';
import { User } from '../users/entities/user.entity';
import { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { StudentAttendanceQueryDto } from './dto/student-attendance-query.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';
import { GradeResponseDto } from './dto/grade-response.dto';
import { paginateArray, getPaginationParams } from '../../common/utils/pagination.util';

interface EnrollDto {
  courseId: string;
  groupId?: string;
}

interface CountRow { count: string; }
interface EnrollCheckRow { id: string; }

interface AttendanceRow {
  id: string;
  tenant_id: string;
  student_id: string;
  schedule_id: string;
  group_id: string;
  marked_by: string;
  status: string;
  date: string;
  arrived_at: string | null;
  late_minutes: number;
  note: string | null;
}

interface SubmissionRow {
  id: string;
  homework_id: string;
  student_id: string;
  content: string;
  status: string;
  submitted_at: string | null;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  hw_title: string;
  hw_max_score: number;
  hw_due_date: string | null;
  teacher_first_name: string | null;
  teacher_last_name: string | null;
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
    await this.studentsRepository.update(id, dto as any);
    return { ...student, ...dto };
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
      `SELECT c.title, c.cover_url, e.status, e.progress_percent, e.enrolled_at, e.completed_at
       FROM enrollments e JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = $1 AND e.tenant_id = $2 ORDER BY e.enrolled_at DESC`,
      [id, tenantId],
    ) as Promise<unknown[]>;
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

  // ─── NEW: Get student attendance (paginated) ──────────────────────────────

  async getAttendance(
    studentId: string,
    tenantId: string,
    query: StudentAttendanceQueryDto,
  ): Promise<PaginatedResult<AttendanceRow>> {
    const student = await this.studentsRepository.findOne({ where: { id: studentId, tenantId } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    const { page, limit, skip } = getPaginationParams(query);

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

    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT a.* FROM attendance a WHERE ${where} ORDER BY a.date DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, skip],
      ) as Promise<AttendanceRow[]>,
      this.dataSource.query(
        `SELECT COUNT(*)::int as total FROM attendance a WHERE ${where}`,
        params,
      ) as Promise<TotalRow[]>,
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return paginateArray(rows, total, page, limit);
  }

  // ─── NEW: Get student grades ──────────────────────────────────────────────

  async getGrades(studentId: string, tenantId: string): Promise<GradeResponseDto[]> {
    const student = await this.studentsRepository.findOne({ where: { id: studentId, tenantId } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    const submissions = await this.dataSource.query(
      `SELECT
         hs.id,
         hs.homework_id,
         hs.student_id,
         hs.content,
         hs.status,
         hs.submitted_at,
         hs.score,
         hs.feedback,
         hs.graded_at,
         hw.title        AS hw_title,
         hw.max_score    AS hw_max_score,
         hw.due_date     AS hw_due_date,
         u.first_name    AS teacher_first_name,
         u.last_name     AS teacher_last_name
       FROM homework_submissions hs
       JOIN homeworks hw ON hw.id = hs.homework_id
       LEFT JOIN teachers t ON t.id = hw.teacher_id
       LEFT JOIN users u ON u.id = t.user_id
       WHERE hs.student_id = $1
         AND hw.tenant_id  = $2
       ORDER BY hs.created_at DESC`,
      [studentId, tenantId],
    ) as SubmissionRow[];

    return submissions.map((sub) => {
      const isGraded = sub.score !== null && sub.score !== undefined;
      const isSubmitted = !!sub.submitted_at;
      const status: 'graded' | 'submitted' | 'pending' = isGraded
        ? 'graded'
        : isSubmitted
        ? 'submitted'
        : 'pending';

      const teacherName =
        sub.teacher_first_name || sub.teacher_last_name
          ? `${sub.teacher_first_name ?? ''} ${sub.teacher_last_name ?? ''}`.trim()
          : null;

      const maxScore = sub.hw_max_score ? Number(sub.hw_max_score) : 100;
      const score = sub.score !== null ? Number(sub.score) : 0;

      return {
        id: sub.id,
        studentId: sub.student_id,
        homeworkId: sub.homework_id,
        homeworkTitle: sub.hw_title ?? 'Unknown',
        courseTitle: null,
        score,
        maxScore,
        percentage: isGraded
          ? Math.round((score / maxScore) * 100 * 10) / 10
          : 0,
        feedback: sub.feedback ?? null,
        gradedAt: sub.graded_at ? new Date(sub.graded_at) : new Date(),
        gradedByName: teacherName,
        teacherName,
        dueDate: sub.hw_due_date ?? null,
        status,
      };
    });
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
