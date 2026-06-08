import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { DayOfWeek } from '../../../shared/enums';
import { Group } from '../../groups/entities/group.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('schedules')
export class Schedule extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'teacher_id', nullable: true })
  teacherId: string;

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ name: 'course_id', nullable: true })
  courseId: string;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'enum', enum: DayOfWeek, name: 'day_of_week' })
  dayOfWeek: DayOfWeek;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ nullable: true })
  room: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ name: 'is_recurring', default: true })
  isRecurring: boolean;

  @Column({ name: 'specific_date', type: 'date', nullable: true })
  specificDate: Date;

  @Column({ name: 'is_cancelled', default: false })
  isCancelled: boolean;

  @Column({ name: 'cancellation_reason', nullable: true })
  cancellationReason: string;

  @Column({ name: 'online_link', nullable: true })
  onlineLink: string;

  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column({ name: 'branch', nullable: true })
  branch: string;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, unknown>;
}
