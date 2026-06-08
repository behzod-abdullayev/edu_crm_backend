import { Entity, Column, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Course } from '../../courses/entities/course.entity';
import { Student } from '../../students/entities/student.entity';

@Entity('groups')
export class Group extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'course_id', nullable: true })
  courseId: string;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'teacher_id', nullable: true })
  teacherId: string;

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ name: 'max_students', default: 20 })
  maxStudents: number;

  @Column({ name: 'current_students', default: 0 })
  currentStudents: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'branch', nullable: true })
  branch: string;

  @Column({ name: 'room', nullable: true })
  room: string;

  @Column({ type: 'jsonb', name: 'schedule', default: [] })
  schedule: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }>;

  @ManyToMany(() => Student)
  @JoinTable({
    name: 'group_students',
    joinColumn: { name: 'group_id' },
    inverseJoinColumn: { name: 'student_id' },
  })
  students: Student[];
}
