import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Student } from './entities/student.entity';

@Injectable()
export class StudentsRepository extends Repository<Student> {
  constructor(private dataSource: DataSource) {
    super(Student, dataSource.createEntityManager());
  }

  async findWithUser(
    tenantId: string,
    page: number,
    limit: number,
    search?: string,
    hasDebt?: boolean,
    branch?: string,
  ): Promise<[Student[], number]> {
    const qb = this.createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .where('student.tenantId = :tenantId', { tenantId });
    if (search) {
      qb.andWhere(
        '(user.firstName ILIKE :s OR user.lastName ILIKE :s OR student.studentCode ILIKE :s OR user.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (hasDebt === true) qb.andWhere('student.debtAmount > 0');
    if (hasDebt === false) qb.andWhere('student.debtAmount = 0');
    if (branch) qb.andWhere('student.branch = :branch', { branch });
    return qb.orderBy('student.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  async findByStudentCode(code: string, tenantId: string): Promise<Student | null> {
    return this.findOne({ where: { studentCode: code, tenantId }, relations: ['user'] });
  }

  async getNextStudentCode(tenantId: string): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) FROM students WHERE tenant_id = $1`,
      [tenantId],
    );
    const count = parseInt(result[0].count, 10) + 1;
    return `STU-${String(count).padStart(5, '0')}`;
  }

  async getPerformanceSummary(studentId: string): Promise<any> {
    const [attendance, homework, exams] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present
         FROM attendances WHERE student_id = $1`,
        [studentId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN status='graded' THEN 1 ELSE 0 END) as completed,
          AVG(score) as avg_score
         FROM homework_submissions WHERE student_id = $1`,
        [studentId],
      ),
      this.dataSource.query(
        `SELECT AVG(total_score) as avg_score, COUNT(*) as total
         FROM exam_results WHERE student_id = $1`,
        [studentId],
      ),
    ]);
    const att = attendance[0];
    const hw = homework[0];
    const ex = exams[0];
    return {
      attendanceRate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
      homeworkCompletionRate: hw.total > 0 ? Math.round((hw.completed / hw.total) * 100) : 0,
      avgHomeworkScore: parseFloat(hw.avg_score) || 0,
      avgExamScore: parseFloat(ex.avg_score) || 0,
      totalExams: parseInt(ex.total, 10),
    };
  }

  async updateDebtAmount(studentId: string, tenantId: string): Promise<void> {
    const result = await this.dataSource.query(
      `SELECT COALESCE(SUM(total_amount), 0) as debt
       FROM payments
       WHERE student_id = $1 AND tenant_id = $2 AND status IN ('pending','overdue')`,
      [studentId, tenantId],
    );
    await this.update(studentId, { debtAmount: parseFloat(result[0].debt) });
  }
}
