import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Course } from './entities/course.entity';

@Injectable()
export class CoursesRepository extends Repository<Course> {
  constructor(private dataSource: DataSource) {
    super(Course, dataSource.createEntityManager());
  }

  async findPaginated(tenantId: string, page: number, limit: number, search?: string, status?: string): Promise<[Course[], number]> {
    const qb = this.createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('course.tenantId = :tenantId', { tenantId });
    if (search) qb.andWhere('(course.title ILIKE :s OR course.description ILIKE :s)', { s: `%${search}%` });
    if (status) qb.andWhere('course.status = :status', { status });
    return qb.orderBy('course.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  async findBySlug(slug: string, tenantId: string): Promise<Course | null> {
    return this.createQueryBuilder('course').where('course.slug = :slug AND course.tenantId = :tenantId', { slug, tenantId }).getOne();
  }

  async getStudentProgress(courseId: string, studentId: string): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT progress_percent, lessons_completed, total_lessons, status
       FROM enrollments WHERE course_id = $1 AND student_id = $2`, [courseId, studentId],
    );
    return result[0] || null;
  }
}
