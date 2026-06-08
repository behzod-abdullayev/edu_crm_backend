import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Homework } from './entities/homework.entity';

@Injectable()
export class HomeworkRepository extends Repository<Homework> {
  constructor(private dataSource: DataSource) {
    super(Homework, dataSource.createEntityManager());
  }

  async findPaginated(tenantId: string, page: number, limit: number, groupId?: string, teacherId?: string): Promise<[Homework[], number]> {
    const qb = this.createQueryBuilder('hw')
      .leftJoinAndSelect('hw.course', 'course')
      .where('hw.tenantId = :tenantId', { tenantId });
    if (groupId) qb.andWhere('hw.groupId = :groupId', { groupId });
    if (teacherId) qb.andWhere('hw.teacherId = :teacherId', { teacherId });
    return qb.orderBy('hw.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  async findForStudent(studentId: string, tenantId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT h.*, hs.status as submission_status, hs.score, hs.submitted_at
       FROM homeworks h
       JOIN enrollments e ON e.group_id = h.group_id AND e.student_id = $1
       LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
       WHERE h.tenant_id = $2
       ORDER BY h.due_date ASC`,
      [studentId, tenantId],
    );
  }
}
