import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';

@Injectable()
export class SchedulesRepository extends Repository<Schedule> {
  constructor(private dataSource: DataSource) {
    super(Schedule, dataSource.createEntityManager());
  }

  async findCalendar(tenantId: string, from: Date, to: Date, groupId?: string, teacherId?: string): Promise<Schedule[]> {
    const qb = this.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.group', 'group')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('schedule.tenantId = :tenantId AND schedule.date BETWEEN :from AND :to', { tenantId, from, to });
    if (groupId) qb.andWhere('schedule.groupId = :groupId', { groupId });
    if (teacherId) qb.andWhere('schedule.teacherId = :teacherId', { teacherId });
    return qb.orderBy('schedule.date', 'ASC').addOrderBy('schedule.startTime', 'ASC').getMany();
  }

  async findForStudent(studentId: string, tenantId: string, from: Date, to: Date): Promise<Schedule[]> {
    return this.dataSource.query(
      `SELECT sch.* FROM schedules sch
       JOIN enrollments e ON e.group_id = sch.group_id AND e.student_id = $1
       WHERE sch.tenant_id = $2 AND sch.date BETWEEN $3 AND $4
       ORDER BY sch.date, sch.start_time`,
      [studentId, tenantId, from, to],
    );
  }
}
