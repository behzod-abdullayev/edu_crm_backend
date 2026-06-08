import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Teacher } from './entities/teacher.entity';

@Injectable()
export class TeachersRepository extends Repository<Teacher> {
  constructor(private dataSource: DataSource) {
    super(Teacher, dataSource.createEntityManager());
  }

  async findWithUser(tenantId: string, page: number, limit: number, search?: string): Promise<[Teacher[], number]> {
    const qb = this.createQueryBuilder('teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('teacher.tenantId = :tenantId', { tenantId });
    if (search) {
      qb.andWhere('(user.firstName ILIKE :s OR user.lastName ILIKE :s OR teacher.teacherCode ILIKE :s)', { s: `%${search}%` });
    }
    return qb.orderBy('teacher.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  async getNextTeacherCode(tenantId: string): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) FROM teachers WHERE tenant_id = $1`, [tenantId],
    );
    const count = parseInt(result[0].count, 10) + 1;
    return `TCH-${String(count).padStart(4, '0')}`;
  }

  async getStats(teacherId: string): Promise<any> {
    const [attendance, homework] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present
         FROM attendances WHERE teacher_id = $1`, [teacherId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='graded' THEN 1 ELSE 0 END) as graded
         FROM homework_submissions hs
         JOIN homeworks h ON hs.homework_id = h.id
         WHERE h.teacher_id = $1`, [teacherId],
      ),
    ]);
    const att = attendance[0];
    const hw = homework[0];
    return {
      attendanceRate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
      homeworkGradedRate: hw.total > 0 ? Math.round((hw.graded / hw.total) * 100) : 0,
    };
  }
}
