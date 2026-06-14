import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { paginate, PaginatedResult, PaginationDto } from '../../common/utils/pagination.util';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupResponseDto, GroupStudentDto } from './dto/group-response.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { TeacherHomeworkItemDto } from '../teachers/dto/teacher-homework-item.dto';
import { AttendanceStatus } from '../../shared/enums';

interface GroupHomeworkRow {
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

interface GroupHomeworkSubmissionCountRow {
  homeworkId: string;
  total: string;
  graded: string;
}

interface GroupAttendanceRow {
  date: string;
  status: AttendanceStatus;
  count: string;
}

export interface GroupAttendanceRecord {
  date: string;
  status: AttendanceStatus;
  courseId: string;
  courseName: string;
  teacherName: string;
  note?: string;
}

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateGroupDto, tenantId: string, createdBy: string): Promise<Group> {
    const group = this.groupRepo.create({ ...dto, tenantId, createdBy });
    return this.groupRepo.save(group);
  }

  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Group>> {
    const qb = this.groupRepo.createQueryBuilder('g')
      .leftJoinAndSelect('g.teacher', 't')
      .leftJoinAndSelect('t.user', 'u')
      .leftJoinAndSelect('g.course', 'c')
      .where('g.tenantId = :tenantId', { tenantId })
      .andWhere('g.deletedAt IS NULL');
    if (query.search) qb.andWhere('g.name ILIKE :q', { q: `%${query.search}%` });
    return paginate(qb, query);
  }

  async findOne(id: string, tenantId: string): Promise<GroupResponseDto> {
    const g = await this.groupRepo.findOne({
      where: { id, tenantId },
      relations: ['teacher', 'teacher.user', 'course', 'students', 'students.user'],
    });
    if (!g) throw new NotFoundException('Group not found');

    const students: GroupStudentDto[] = (g.students ?? []).map((student) => ({
      id: student.id,
      firstName: student.user?.firstName ?? '',
      lastName: student.user?.lastName ?? '',
      email: student.user?.email ?? '',
      profilePictureUrl: student.user?.avatarUrl ?? null,
      studentCode: student.studentCode ?? '',
    }));

    return {
      id: g.id,
      name: g.name,
      description: g.description ?? null,
      courseId: g.courseId ?? null,
      courseName: g.course?.title ?? null,
      teacherId: g.teacherId ?? null,
      teacherName: g.teacher?.user
        ? `${g.teacher.user.firstName} ${g.teacher.user.lastName}`
        : null,
      maxStudents: g.maxStudents,
      currentStudents: students.length,
      startDate: g.startDate ? new Date(g.startDate).toISOString() : null,
      endDate: g.endDate ? new Date(g.endDate).toISOString() : null,
      isActive: g.isActive,
      branch: g.branch ?? null,
      room: g.room ?? null,
      tenantId: g.tenantId,
      createdAt: (g.createdAt as unknown as Date).toISOString(),
      students,
    };
  }

  async update(id: string, tenantId: string, dto: UpdateGroupDto, updatedBy: string): Promise<Group> {
    const group = await this.groupRepo.findOne({ where: { id, tenantId } });
    if (!group) throw new NotFoundException('Group not found');
    Object.assign(group, { ...dto, updatedBy });
    return this.groupRepo.save(group);
  }

  async addStudent(groupId: string, studentId: string, tenantId: string): Promise<GroupResponseDto> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId, tenantId },
      relations: ['students'],
    });
    if (!group) throw new NotFoundException('Group not found');
    const student = await this.studentRepo.findOne({ where: { id: studentId, tenantId } });
    if (!student) throw new NotFoundException('Student not found');
    if (!group.students) group.students = [];
    group.students.push(student);
    group.currentStudents = group.students.length;
    await this.groupRepo.save(group);
    return this.findOne(groupId, tenantId);
  }

  async removeStudent(groupId: string, studentId: string, tenantId: string): Promise<GroupResponseDto> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId, tenantId },
      relations: ['students'],
    });
    if (!group) throw new NotFoundException('Group not found');
    group.students = (group.students || []).filter((s) => s.id !== studentId);
    group.currentStudents = group.students.length;
    await this.groupRepo.save(group);
    return this.findOne(groupId, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id, tenantId } });
    if (!group) throw new NotFoundException('Group not found');
    await this.groupRepo.softRemove(group);
  }

  async getHomework(groupId: string, tenantId: string): Promise<TeacherHomeworkItemDto[]> {
    await this.findOne(groupId, tenantId);

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
       WHERE hw.group_id = $1 AND hw.tenant_id = $2 AND hw.deleted_at IS NULL
       ORDER BY hw.created_at DESC`,
      [groupId, tenantId],
    ) as GroupHomeworkRow[];

    const homeworkIds = rows.map((r) => r.id);
    const countsByHomework = new Map<string, { total: number; graded: number }>();
    if (homeworkIds.length > 0) {
      const countRows = await this.dataSource.query(
        `SELECT homework_id as "homeworkId",
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE status = 'graded')::int as graded
         FROM homework_submissions
         WHERE homework_id = ANY($1::uuid[]) AND tenant_id = $2
         GROUP BY homework_id`,
        [homeworkIds, tenantId],
      ) as GroupHomeworkSubmissionCountRow[];
      for (const r of countRows) {
        countsByHomework.set(r.homeworkId, { total: Number(r.total), graded: Number(r.graded) });
      }
    }

    const now = new Date();
    return rows.map((r) => {
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
  }

  async getAttendance(groupId: string, tenantId: string): Promise<{ records: GroupAttendanceRecord[] }> {
    const group = await this.findOne(groupId, tenantId);

    const rows = await this.dataSource.query(
      `SELECT to_char(a.date, 'YYYY-MM-DD') as date, a.status, COUNT(*)::int as count
       FROM attendance a
       WHERE a.group_id = $1 AND a.tenant_id = $2
       GROUP BY a.date, a.status
       ORDER BY a.date ASC`,
      [groupId, tenantId],
    ) as GroupAttendanceRow[];

    const byDate = new Map<string, Map<AttendanceStatus, number>>();
    for (const r of rows) {
      const statusCounts = byDate.get(r.date) ?? new Map<AttendanceStatus, number>();
      statusCounts.set(r.status, Number(r.count));
      byDate.set(r.date, statusCounts);
    }

    const courseId = group.courseId ?? '';
    const courseName = group.courseName ?? group.name;
    const teacherName = group.teacherName ?? '';

    const records: GroupAttendanceRecord[] = [];
    for (const [date, statusCounts] of byDate) {
      let dominantStatus: AttendanceStatus = AttendanceStatus.PRESENT;
      let dominantCount = -1;
      let total = 0;
      const parts: string[] = [];
      for (const [status, count] of statusCounts) {
        total += count;
        parts.push(`${count} ${status}`);
        if (count > dominantCount) {
          dominantCount = count;
          dominantStatus = status;
        }
      }
      records.push({
        date,
        status: dominantStatus,
        courseId,
        courseName,
        teacherName,
        note: `${total} student${total === 1 ? '' : 's'}: ${parts.join(', ')}`,
      });
    }

    return { records };
  }
}
