import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { paginate, PaginatedResult, PaginationDto } from '../../common/utils/pagination.util';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupResponseDto, GroupStudentDto } from './dto/group-response.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
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
      startDate: g.startDate ? (g.startDate as unknown as Date).toISOString() : null,
      endDate: g.endDate ? (g.endDate as unknown as Date).toISOString() : null,
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
}
