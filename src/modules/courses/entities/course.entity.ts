import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { CourseStatus } from '../../../shared/enums';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Lesson } from './lesson.entity';

@Entity('courses')
export class Course extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'short_description', nullable: true })
  shortDescription: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'cover_url', nullable: true })
  coverUrl: string;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  @Column({ name: 'teacher_id', nullable: true })
  teacherId: string;

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: number;

  @Column({ default: 'UZS' })
  currency: string;

  @Column({ name: 'duration_hours', default: 0 })
  durationHours: number;

  @Column({ name: 'max_students', default: 30 })
  maxStudents: number;

  @Column({ name: 'enrolled_count', default: 0 })
  enrolledCount: number;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @Column({ default: 'uz' })
  language: string;

  @Column({ name: 'difficulty_level', default: 'beginner' })
  difficultyLevel: string;

  @Column({ name: 'certificate_enabled', default: true })
  certificateEnabled: boolean;

  @Column({ name: 'certificate_template_id', nullable: true })
  certificateTemplateId: string;

  @Column({ name: 'passing_score', type: 'decimal', precision: 5, scale: 2, default: 60 })
  passingScore: number;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => Lesson, (lesson) => lesson.course)
  lessons: Lesson[];
}
