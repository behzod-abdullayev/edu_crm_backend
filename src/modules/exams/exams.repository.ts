import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Exam } from './entities/exam.entity';

@Injectable()
export class ExamsRepository extends Repository<Exam> {
  constructor(private dataSource: DataSource) {
    super(Exam, dataSource.createEntityManager());
  }

  async findPaginated(tenantId: string, page: number, limit: number, groupId?: string): Promise<[Exam[], number]> {
    const qb = this.createQueryBuilder('exam').where('exam.tenantId = :tenantId', { tenantId });
    if (groupId) qb.andWhere('exam.groupId = :groupId', { groupId });
    return qb.orderBy('exam.startAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  async getQuestionsShuffled(examId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY RANDOM()`, [examId],
    );
  }

  async autoGrade(examId: string, answers: Record<string, string>): Promise<number> {
    const questions = await this.dataSource.query(
      `SELECT id, type, correct_answer, options, points FROM exam_questions WHERE exam_id = $1`, [examId],
    );
    let score = 0;
    for (const q of questions) {
      const studentAnswer = answers[q.id];
      if (!studentAnswer) continue;
      if (q.type === 'multiple_choice') {
        const options = q.options as Array<{ id: string; isCorrect: boolean }>;
        const correct = options.find((o) => o.isCorrect);
        if (correct && studentAnswer === correct.id) score += q.points;
      } else if (q.type === 'true_false' || q.type === 'short_answer') {
        if (studentAnswer.toLowerCase() === (q.correct_answer || '').toLowerCase()) score += q.points;
      }
    }
    return score;
  }
}
