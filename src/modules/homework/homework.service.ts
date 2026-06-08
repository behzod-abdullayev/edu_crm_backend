import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Homework, HomeworkSubmission } from './entities/homework.entity';
import { HomeworkStatus } from '../../shared/enums';
import { paginate, PaginatedResult, PaginationDto } from '../../common/utils/pagination.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

@Injectable()
export class HomeworkService {
  constructor(
    @InjectRepository(Homework) private hwRepo: Repository<Homework>,
    @InjectRepository(HomeworkSubmission) private subRepo: Repository<HomeworkSubmission>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateHomeworkDto, tenantId: string, createdBy: string): Promise<Homework> {
    const hw = this.hwRepo.create({
      title: dto.title,
      description: dto.description,
      groupId: dto.groupId,
      lessonId: dto.lessonId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      maxScore: dto.maxScore ?? 100,
      tenantId,
      createdBy,
      teacherId: createdBy,
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

  async update(id: string, dto: UpdateHomeworkDto, tenantId: string): Promise<Homework> {
    const hw = await this.findOne(id, tenantId);
    if (dto.title !== undefined) hw.title = dto.title;
    if (dto.description !== undefined) hw.description = dto.description;
    if (dto.dueDate !== undefined) hw.dueDate = new Date(dto.dueDate);
    if (dto.maxScore !== undefined) hw.maxScore = dto.maxScore;
    return this.hwRepo.save(hw);
  }

  async submit(homeworkId: string, studentId: string, tenantId: string, data: { content?: string }): Promise<HomeworkSubmission> {
    const hw = await this.findOne(homeworkId, tenantId);
    const isLate = new Date() > hw.dueDate;

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

  async grade(submissionId: string, tenantId: string, score: number, feedback: string, gradedBy: string): Promise<HomeworkSubmission> {
    const sub = await this.subRepo.findOne({ where: { id: submissionId, tenantId } });
    if (!sub) throw new NotFoundException('Submission not found');
    Object.assign(sub, {
      score, feedback, gradedBy, status: HomeworkStatus.GRADED, gradedAt: new Date(),
    });
    const saved = await this.subRepo.save(sub);
    this.eventEmitter.emit('homework.graded', { submission: saved });
    return saved;
  }

  async getSubmissions(homeworkId: string, tenantId: string): Promise<HomeworkSubmission[]> {
    return this.subRepo.find({ where: { homeworkId, tenantId } });
  }

  async getStudentSubmissions(studentId: string, tenantId: string): Promise<HomeworkSubmission[]> {
    return this.subRepo.find({ where: { studentId, tenantId }, relations: ['homework'] });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const hw = await this.findOne(id, tenantId);
    await this.hwRepo.softRemove(hw);
  }
}
