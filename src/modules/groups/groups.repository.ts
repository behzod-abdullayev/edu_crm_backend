import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Group } from './entities/group.entity';

@Injectable()
export class GroupsRepository extends Repository<Group> {
  constructor(private dataSource: DataSource) {
    super(Group, dataSource.createEntityManager());
  }

  async findPaginated(tenantId: string, page: number, limit: number, courseId?: string, teacherId?: string): Promise<[Group[], number]> {
    const qb = this.createQueryBuilder('group')
      .leftJoinAndSelect('group.course', 'course')
      .leftJoinAndSelect('group.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('group.tenantId = :tenantId', { tenantId });
    if (courseId) qb.andWhere('group.courseId = :courseId', { courseId });
    if (teacherId) qb.andWhere('group.teacherId = :teacherId', { teacherId });
    return qb.orderBy('group.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  async updateStudentCount(groupId: string): Promise<void> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) FROM enrollments WHERE group_id = $1 AND status = 'active'`, [groupId],
    );
    await this.createQueryBuilder().update().set({ currentCount: parseInt(result[0].count, 10) } as any).where('id = :id', { id: groupId }).execute();
  }
}
