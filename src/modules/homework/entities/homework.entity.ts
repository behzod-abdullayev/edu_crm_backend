import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { HomeworkStatus } from '../../../shared/enums';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Group } from '../../groups/entities/group.entity';
import { Lesson } from '../../courses/entities/lesson.entity';

@Entity('homeworks')
export class Homework extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'lesson_id', nullable: true })
  lessonId: string;

  @ManyToOne(() => Lesson, { nullable: true })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

  @Column({ name: 'max_score', type: 'decimal', precision: 5, scale: 2, default: 100 })
  maxScore: number;

  @Column({ type: 'jsonb', name: 'attachments', default: [] })
  attachments: Array<{ name: string; url: string; type: string }>;

  @Column({ name: 'is_graded', default: false })
  isGraded: boolean;

  @OneToMany(() => HomeworkSubmission, (s) => s.homework)
  submissions: HomeworkSubmission[];
}

@Entity('homework_submissions')
@Unique(['homeworkId', 'studentId'])
export class HomeworkSubmission extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'homework_id' })
  homeworkId: string;

  @ManyToOne(() => Homework, (h) => h.submissions)
  @JoinColumn({ name: 'homework_id' })
  homework: Homework;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'jsonb', name: 'attachments', default: [] })
  attachments: Array<{ name: string; url: string }>;

  @Column({ type: 'enum', enum: HomeworkStatus, default: HomeworkStatus.SUBMITTED })
  status: HomeworkStatus;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ name: 'score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ name: 'feedback', type: 'text', nullable: true })
  feedback: string;

  @Column({ name: 'graded_by', nullable: true })
  gradedBy: string;

  @Column({ name: 'graded_at', type: 'timestamp', nullable: true })
  gradedAt: Date;

  @Column({ name: 'is_late', default: false })
  isLate: boolean;
}
