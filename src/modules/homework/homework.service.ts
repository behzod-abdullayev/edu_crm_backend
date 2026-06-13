import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Homework, HomeworkSubmission } from './entities/homework.entity';
import { HomeworkStatus } from '../../shared/enums';
import { paginate, PaginatedResult, PaginationDto } from '../../common/utils/pagination.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { HomeworkSubmissionItemDto } from './dto/homework-submission-item.dto';
import { HomeworkDetailDto } from './dto/homework-detail.dto';

interface HomeworkDetailRow {
  id: string;
  title: string;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
  courseId: string | null;
  courseName: string | null;
  teacherId: string;
  dueDate: Date | null;
  maxPoints: string;
  attachments: Array<{ name: string; url: string; type: string }> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SubmissionRow {
  id: string;
  homeworkId: string;
  studentId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  textAnswer: string | null;
  attachments: Array<{ name: string; url: string }> | null;
  grade: string | null;
  teacherFeedback: string | null;
  submittedAt: Date | null;
  gradedAt: Date | null;
  status: HomeworkStatus;
  isLate: boolean;
}

@Injectable()
export class HomeworkService {
  constructor(
    @InjectRepository(Homework) private hwRepo: Repository<Homework>,
    @InjectRepository(HomeworkSubmission) private subRepo: Repository<HomeworkSubmission>,
    private eventEmitter: EventEmitter2,
    private dataSource: DataSource,
  ) {}

  private mapSubmissionRow(r: SubmissionRow): HomeworkSubmissionItemDto {
    const status: 'pending' | 'graded' | 'late' =
      r.status === HomeworkStatus.GRADED ? 'graded' : r.isLate ? 'late' : 'pending';

    return {
      id: r.id,
      homeworkId: r.homeworkId,
      studentId: r.studentId,
      studentName: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
      ...(r.avatarUrl ? { studentAvatarUrl: r.avatarUrl } : {}),
      ...(r.textAnswer ? { textAnswer: r.textAnswer } : {}),
      ...(r.attachments?.length ? { attachedFileKeys: r.attachments.map((a) => a.url) } : {}),
      ...(r.grade !== null && r.grade !== undefined ? { grade: Number(r.grade) } : {}),
      ...(r.teacherFeedback ? { teacherFeedback: r.teacherFeedback } : {}),
      ...(r.submittedAt ? { submittedAt: new Date(r.submittedAt).toISOString() } : {}),
      ...(r.gradedAt ? { gradedAt: new Date(r.gradedAt).toISOString() } : {}),
      status,
    };
  }

  async create(dto: CreateHomeworkDto, tenantId: string, createdBy: string): Promise<Homework> {
    const teacherRows = await this.dataSource.query(
      `SELECT id FROM teachers WHERE user_id = $1 AND tenant_id = $2`,
      [createdBy, tenantId],
    ) as Array<{ id: string }>;
    const teacherId = teacherRows[0]?.id;
    if (!teacherId) throw new NotFoundException('Teacher profile not found for current user');

    const hw = this.hwRepo.create({
      title: dto.title,
      description: dto.description,
      groupId: dto.groupId,
      lessonId: dto.lessonId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      maxScore: dto.maxScore ?? 100,
      tenantId,
      createdBy,
      teacherId,
    });
    const saved = await this.hwRepo.save(hw);
    this.eventEmitter.emit('homework.created', { homework: saved });
    return saved;
  }

  async findAll(tenantId: string, query: PaginationDto & { groupId?: string; teacherId?: string }): Promise<PaginatedResult<Homework>> {
    const qb = this.hwRepo.createQueryBuilder('h')
      .leftJoinAndSelect('h.teacher', 't')
      .leftJoinAndSelect('t.user', 'u')
      .where('h.tenantId = :tenantId', { tenantId });
    if (query.groupId) qb.andWhere('h.groupId = :groupId', { groupId: query.groupId });
    if (query.teacherId) qb.andWhere('h.teacherId = :teacherId', { teacherId: query.teacherId });
    return paginate(qb, query);
  }

  async findOne(id: string, tenantId: string): Promise<Homework> {
    const h = await this.hwRepo.findOne({ where: { id, tenantId }, relations: ['teacher', 'teacher.user', 'submissions'] });
    if (!h) throw new NotFoundException('Homework not found');
    return h;
  }

  async getDetail(id: string, tenantId: string): Promise<HomeworkDetailDto> {
    const rows = await this.dataSource.query(
      `SELECT hw.id, hw.title, hw.description,
              hw.group_id as "groupId", g.name as "groupName",
              g.course_id as "courseId", c.title as "courseName",
              hw.teacher_id as "teacherId", hw.due_date as "dueDate",
              hw.max_score as "maxPoints", hw.attachments,
              hw.created_at as "createdAt", hw.updated_at as "updatedAt"
       FROM homeworks hw
       LEFT JOIN groups g ON g.id = hw.group_id
       LEFT JOIN courses c ON c.id = g.course_id
       WHERE hw.id = $1 AND hw.tenant_id = $2 AND hw.deleted_at IS NULL`,
      [id, tenantId],
    ) as HomeworkDetailRow[];

    const row = rows[0];
    if (!row) throw new NotFoundException('Homework not found');

    const submissions = await this.getSubmissions(id, tenantId);
    const gradedCount = submissions.filter((s) => s.status === 'graded').length;
    const isClosed = !!row.dueDate && new Date(row.dueDate) < new Date();
    const maxPoints = Number(row.maxPoints);

    return {
      id: row.id,
      title: row.title,
      ...(row.description ? { description: row.description } : {}),
      groupId: row.groupId ?? '',
      ...(row.groupName ? { groupName: row.groupName } : {}),
      ...(row.courseId ? { courseId: row.courseId } : {}),
      ...(row.courseName ? { courseName: row.courseName } : {}),
      teacherId: row.teacherId,
      ...(row.dueDate ? { dueDate: new Date(row.dueDate).toISOString() } : {}),
      maxPoints,
      maxScore: maxPoints,
      allowResubmit: false,
      ...(row.attachments?.length ? { attachedFileKeys: row.attachments.map((a) => a.url) } : {}),
      submissionsCount: submissions.length,
      gradedCount,
      status: isClosed ? 'closed' : 'published',
      submissions,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  async update(id: string, dto: UpdateHomeworkDto, tenantId: string): Promise<Homework> {
    const hw = await this.findOne(id, tenantId);
    if (dto.title !== undefined) hw.title = dto.title;
    if (dto.description !== undefined) hw.description = dto.description;
    if (dto.dueDate !== undefined) hw.dueDate = new Date(dto.dueDate);
    if (dto.maxScore !== undefined) hw.maxScore = dto.maxScore;
    return this.hwRepo.save(hw);
  }

  async submit(homeworkId: string, userId: string, tenantId: string, data: { content?: string }): Promise<HomeworkSubmission> {
    const hw = await this.findOne(homeworkId, tenantId);
    const isLate = new Date() > hw.dueDate;

    const studentRows = await this.dataSource.query(
      `SELECT id FROM students WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    ) as Array<{ id: string }>;
    const studentId = studentRows[0]?.id;
    if (!studentId) throw new NotFoundException('Student profile not found for current user');

    let sub = await this.subRepo.findOne({ where: { homeworkId, studentId, tenantId } });
    if (sub) {
      Object.assign(sub, { content: data.content, isLate, status: HomeworkStatus.SUBMITTED, submittedAt: new Date() });
    } else {
      sub = this.subRepo.create({
        content: data.content,
        homeworkId,
        studentId,
        tenantId,
        isLate,
        status: HomeworkStatus.SUBMITTED,
        submittedAt: new Date(),
      });
    }
    const saved = await this.subRepo.save(sub);
    this.eventEmitter.emit('homework.submitted', { submission: saved });
    return saved;
  }

  async grade(submissionId: string, tenantId: string, score: number, feedback: string, gradedBy: string): Promise<HomeworkSubmissionItemDto> {
    const sub = await this.subRepo.findOne({ where: { id: submissionId, tenantId } });
    if (!sub) throw new NotFoundException('Submission not found');
    Object.assign(sub, {
      score, feedback, gradedBy, status: HomeworkStatus.GRADED, gradedAt: new Date(),
    });
    const saved = await this.subRepo.save(sub);
    this.eventEmitter.emit('homework.graded', { submission: saved });

    const rows = await this.dataSource.query(
      `SELECT hs.id, hs.homework_id as "homeworkId", hs.student_id as "studentId",
              u."firstName" as "firstName", u."lastName" as "lastName", u.avatar_url as "avatarUrl",
              hs.content as "textAnswer", hs.attachments,
              hs.score as "grade", hs.feedback as "teacherFeedback",
              hs.submitted_at as "submittedAt", hs.graded_at as "gradedAt",
              hs.status, hs.is_late as "isLate"
       FROM homework_submissions hs
       JOIN students s ON s.id = hs.student_id::uuid
       JOIN users u ON u.id = s.user_id
       WHERE hs.id = $1 AND hs.tenant_id = $2`,
      [submissionId, tenantId],
    ) as SubmissionRow[];

    return this.mapSubmissionRow(rows[0]!);
  }

  async getSubmissions(homeworkId: string, tenantId: string): Promise<HomeworkSubmissionItemDto[]> {
    const rows = await this.dataSource.query(
      `SELECT hs.id, hs.homework_id as "homeworkId", hs.student_id as "studentId",
              u."firstName" as "firstName", u."lastName" as "lastName", u.avatar_url as "avatarUrl",
              hs.content as "textAnswer", hs.attachments,
              hs.score as "grade", hs.feedback as "teacherFeedback",
              hs.submitted_at as "submittedAt", hs.graded_at as "gradedAt",
              hs.status, hs.is_late as "isLate"
       FROM homework_submissions hs
       JOIN students s ON s.id = hs.student_id::uuid
       JOIN users u ON u.id = s.user_id
       WHERE hs.homework_id = $1 AND hs.tenant_id = $2
       ORDER BY hs.submitted_at DESC`,
      [homeworkId, tenantId],
    ) as SubmissionRow[];

    return rows.map((r) => this.mapSubmissionRow(r));
  }

  async getStudentSubmissions(studentId: string, tenantId: string): Promise<HomeworkSubmission[]> {
    return this.subRepo.find({ where: { studentId, tenantId }, relations: ['homework'] });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const hw = await this.findOne(id, tenantId);
    await this.hwRepo.softRemove(hw);
  }
}
