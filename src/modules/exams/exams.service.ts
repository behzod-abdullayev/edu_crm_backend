import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam, ExamQuestion, ExamAttempt } from './entities/exam.entity';
import { paginate, PaginatedResult, PaginationDto } from '../../common/utils/pagination.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateExamDto, UpdateExamDto } from './dto/create-exam.dto';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectRepository(ExamQuestion) private questionRepo: Repository<ExamQuestion>,
    @InjectRepository(ExamAttempt) private attemptRepo: Repository<ExamAttempt>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateExamDto, tenantId: string, createdBy: string): Promise<Exam> {
    const { startAt, endAt, ...rest } = dto;
    const exam = this.examRepo.create({
      ...rest,
      ...(startAt ? { startAt: new Date(startAt) } : {}),
      ...(endAt ? { endAt: new Date(endAt) } : {}),
      tenantId,
      createdBy,
    });
    return this.examRepo.save(exam);
  }

  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Exam>> {
    const qb = this.examRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.teacher', 't')
      .leftJoinAndSelect('t.user', 'u')
      .where('e.tenantId = :tenantId', { tenantId });
    return paginate(qb, query);
  }

  async findOne(id: string, tenantId: string): Promise<Exam> {
    const e = await this.examRepo.findOne({
      where: { id, tenantId },
      relations: ['questions', 'teacher', 'teacher.user'],
    });
    if (!e) throw new NotFoundException('Exam not found');
    return e;
  }

  async update(id: string, tenantId: string, dto: UpdateExamDto | Partial<Exam>): Promise<Exam> {
    const exam = await this.findOne(id, tenantId);
    if ('startAt' in dto && typeof dto.startAt === 'string') {
      (dto as any).startAt = new Date(dto.startAt as string);
    }
    if ('endAt' in dto && typeof dto.endAt === 'string') {
      (dto as any).endAt = new Date(dto.endAt as string);
    }
    Object.assign(exam, dto);
    return this.examRepo.save(exam);
  }

  async publish(id: string, tenantId: string): Promise<Exam> {
    return this.update(id, tenantId, { isPublished: true });
  }

  async addQuestion(examId: string, tenantId: string, dto: Partial<ExamQuestion>): Promise<ExamQuestion> {
    await this.findOne(examId, tenantId);
    const q = this.questionRepo.create({ ...dto, examId });
    return this.questionRepo.save(q);
  }

  async addQuestionsBulk(
    examId: string,
    tenantId: string,
    questions: Partial<ExamQuestion>[],
  ): Promise<ExamQuestion[]> {
    await this.findOne(examId, tenantId);
    const qs = questions.map((q) => this.questionRepo.create({ ...q, examId }));
    return this.questionRepo.save(qs);
  }

  async startAttempt(examId: string, studentId: string, tenantId: string): Promise<ExamAttempt> {
    const exam = await this.findOne(examId, tenantId);
    if (!exam.isPublished) throw new BadRequestException('Exam is not published');

    const existingCount = await this.attemptRepo.count({ where: { examId, studentId } });
    if (existingCount >= exam.maxAttempts) {
      throw new BadRequestException(`Maximum ${exam.maxAttempts} attempt(s) reached`);
    }

    const attempt = this.attemptRepo.create({
      examId, studentId, startedAt: new Date(), attemptNumber: existingCount + 1,
    });
    const saved = await this.attemptRepo.save(attempt);
    // Notify the student that their exam has started
    this.eventEmitter.emit('exam.started', { studentId, exam });
    return saved;
  }

  async submitAttempt(
    attemptId: string,
    studentId: string,
    answers: Array<{ questionId: string; answer: string }>,
  ): Promise<ExamAttempt> {
    const attempt = await this.attemptRepo.findOne({ where: { id: attemptId, studentId } });
    if (!attempt) throw new NotFoundException('Attempt not found');

    const exam = await this.examRepo.findOne({ where: { id: attempt.examId }, relations: ['questions'] });
    if (!exam) throw new NotFoundException('Exam not found');

    let totalScore = 0;
    const gradedAnswers = answers.map((a) => {
      const question = exam.questions.find((q) => q.id === a.questionId);
      if (!question) return { ...a, isCorrect: false, marks: 0 };

      let isCorrect = false;
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        const correctOption = question.options.find((o) => o.isCorrect);
        isCorrect = correctOption?.id === a.answer;
      } else if (question.correctAnswer) {
        isCorrect = question.correctAnswer.toLowerCase().trim() === a.answer.toLowerCase().trim();
      }

      const marks = isCorrect ? Number(question.marks) : 0;
      totalScore += marks;
      return { ...a, isCorrect, marks };
    });

    const timeTaken = Math.round((Date.now() - attempt.startedAt.getTime()) / 60000);
    const isPassed = totalScore >= Number(exam.passingMarks);

    Object.assign(attempt, {
      answers: gradedAnswers, score: totalScore, isPassed,
      submittedAt: new Date(), timeTakenMinutes: timeTaken,
    });

    const saved = await this.attemptRepo.save(attempt);
    this.eventEmitter.emit('exam.completed', { attempt: saved, isPassed });
    return saved;
  }

  async getAttempts(examId: string, tenantId: string): Promise<ExamAttempt[]> {
    return this.attemptRepo.find({ where: { examId } });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const exam = await this.findOne(id, tenantId);
    await this.examRepo.softRemove(exam);
  }
}
