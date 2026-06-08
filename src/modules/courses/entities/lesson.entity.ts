import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { LessonType } from '../../../shared/enums';
import { Course } from './course.entity';

@Entity('lessons')
export class Lesson extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'course_id' })
  courseId: string;

  @ManyToOne(() => Course, (course) => course.lessons)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.TEXT,
  })
  type: LessonType;

  @Column({ name: 'video_url', nullable: true })
  videoUrl: string;

  @Column({ name: 'video_duration', nullable: true })
  videoDuration: number;

  @Column({ name: 'file_url', nullable: true })
  fileUrl: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'module_number', default: 1 })
  moduleNumber: number;

  @Column({ name: 'is_free', default: false })
  isFree: boolean;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'duration_minutes', default: 0 })
  durationMinutes: number;

  @Column({ type: 'jsonb', name: 'attachments', default: [] })
  attachments: Array<{ name: string; url: string; type: string }>;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, unknown>;
}
