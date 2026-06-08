import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CoursesRepository } from './courses.repository';
import { Course } from './entities/course.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { Lesson } from './entities/lesson.entity';
import { Enrollment } from './entities/enrollment.entity';
import { CourseModule } from './entities/module.entity';
import { generateUniqueSlug } from '../../common/utils/slug.util';
import { PaginatedResult } from '../../shared/dtos/pagination.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CoursesService {
  constructor(
    private coursesRepository: CoursesRepository,
    @InjectRepository(Lesson) private lessonsRepo: Repository<Lesson>,
    @InjectRepository(Enrollment) private enrollmentsRepo: Repository<Enrollment>,
    @InjectRepository(CourseModule) private modulesRepo: Repository<CourseModule>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(tenantId: string, query: QueryCoursesDto | Record<string, unknown>): Promise<PaginatedResult<Course>> {
    const { page = 1, limit = 20, search, status } = query as Record<string, unknown>;
    const [data, total] = await this.coursesRepository.findPaginated(
      tenantId,
      Number(page),
      Number(limit),
      search as string | undefined,
      status as string | undefined,
    );
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  async findOne(id: string, tenantId: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({ where: { id, tenantId }, relations: ['teacher', 'teacher.user'] });
    if (!course) throw new NotFoundException('Course not found');
    return course as unknown as Course;
  }

  async create(dto: CreateCourseDto, tenantId: string): Promise<Course> {
    const existingSlugs = await this.dataSource.query(`SELECT slug FROM courses WHERE tenant_id = $1`, [tenantId]);
    const slug = generateUniqueSlug(dto.title, existingSlugs.map((r: { slug: string }) => r.slug));
    const course = this.coursesRepository.create({ ...dto, tenantId, slug } as any);
    const saved = await this.coursesRepository.save(course) as unknown as Course;
    this.eventEmitter.emit('course.created', { course: saved, tenantId });
    return saved;
  }

  async update(id: string, dto: UpdateCourseDto, tenantId: string): Promise<Course> {
    await this.findOne(id, tenantId);
    await this.coursesRepository.update(id, dto as any);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.coursesRepository.softDelete(id);
  }

  async publish(id: string, tenantId: string): Promise<{ message: string }> {
    await this.findOne(id, tenantId);
    await this.coursesRepository.update(id, { status: 'published' } as any);
    return { message: 'Course published' };
  }

  async addModule(courseId: string, dto: CreateModuleDto, tenantId: string): Promise<CourseModule> {
    await this.findOne(courseId, tenantId);
    const mod = this.modulesRepo.create({ ...dto, courseId } as any);
    return this.modulesRepo.save(mod) as unknown as Promise<CourseModule>;
  }

  async addLesson(courseId: string, dto: CreateLessonDto, tenantId: string): Promise<Lesson> {
    await this.findOne(courseId, tenantId);
    const lesson = this.lessonsRepo.create({ ...dto, courseId } as any);
    return this.lessonsRepo.save(lesson) as unknown as Promise<Lesson>;
  }

  async getStudents(courseId: string, tenantId: string): Promise<Array<Record<string, unknown>>> {
    await this.findOne(courseId, tenantId);
    return this.dataSource.query(
      `SELECT u.first_name, u.last_name, u.email, s.student_code, e.progress_percent, e.status, e.enrolled_at
       FROM enrollments e JOIN students s ON s.id = e.student_id JOIN users u ON u.id = s.user_id
       WHERE e.course_id = $1 AND e.tenant_id = $2 ORDER BY e.enrolled_at DESC`,
      [courseId, tenantId],
    );
  }

  async getProgress(courseId: string, studentId: string, tenantId: string): Promise<unknown> {
    return this.coursesRepository.getStudentProgress(courseId, studentId);
  }

  async updateProgress(courseId: string, studentId: string, dto: Record<string, unknown>, tenantId: string): Promise<{ message: string }> {
    await this.dataSource.query(
      `UPDATE enrollments SET progress_percent = $1, lessons_completed = $2, last_accessed_at = NOW(), updated_at = NOW()
       WHERE course_id = $3 AND student_id = $4`,
      [dto.progressPercent, dto.lessonsCompleted, courseId, studentId],
    );
    return { message: 'Progress updated' };
  }

  async getModules(courseId: string, tenantId: string): Promise<CourseModule[]> {
    await this.findOne(courseId, tenantId);

    const modules = await this.modulesRepo.find({
      where: { courseId },
      order: { order: 'ASC' },
    });

    return modules;
  }

  async enrollStudent(
    courseId: string,
    studentId: string,
    dto: { groupId?: string },
    tenantId: string,
  ): Promise<EnrollmentResponseDto> {
    await this.findOne(courseId, tenantId);

    const studentRows = await this.dataSource.query(
      `SELECT id FROM students WHERE id = $1 AND tenant_id = $2`,
      [studentId, tenantId],
    ) as Array<{ id: string }>;
    if (!studentRows.length) throw new NotFoundException(`Student ${studentId} not found`);

    const existing = await this.enrollmentsRepo.findOne({
      where: { courseId, studentId },
    });
    if (existing) throw new ConflictException('Student already enrolled in this course');

    const lessonCountRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM lessons WHERE course_id = $1 AND is_published = true`,
      [courseId],
    ) as Array<{ count: number }>;
    const totalLessons = Number(lessonCountRows[0]?.count ?? 0);

    const enrollment = this.enrollmentsRepo.create({
      courseId,
      studentId,
      tenantId,
      enrolledAt: new Date(),
      isActive: true,
      paymentStatus: 'pending',
      progressPercent: 0,
      completedLessons: 0,
      totalLessons,
      discountPercent: 0,
      paidAmount: 0,
    } as any);

    const saved = await this.enrollmentsRepo.save(enrollment) as unknown as Enrollment;

    return {
      id: saved.id,
      studentId: saved.studentId,
      courseId: saved.courseId,
      enrolledAt: saved.enrolledAt.toISOString(),
      status: saved.isActive ? 'active' : 'dropped',
      groupId: dto.groupId,
    };
  }

  async attachFileToLesson(
    lessonId: string,
    fileKey: string,
    tenantId: string,
  ): Promise<Lesson> {
    const lesson = await this.lessonsRepo.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson || lesson.course.tenantId !== tenantId) {
      throw new NotFoundException(`Lesson with id "${lessonId}" not found`);
    }

    lesson.fileUrl = `/api/v1/files/serve/${fileKey}`;

    return this.lessonsRepo.save(lesson);
  }
}
