import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { AttendanceStatus } from '../../../shared/enums';
import { Student } from '../../students/entities/student.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { Group } from '../../groups/entities/group.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

@Entity('attendance')
@Unique(['studentId', 'scheduleId'])
export class Attendance extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId: string;

  @ManyToOne(() => Schedule, { nullable: true })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'marked_by', nullable: true })
  markedBy: string;

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'marked_by' })
  teacher: Teacher;

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.ABSENT })
  status: AttendanceStatus;

  @Column({ name: 'date', type: 'date' })
  date: Date;

  @Column({ name: 'arrived_at', nullable: true, type: 'timestamp' })
  arrivedAt: Date;

  @Column({ name: 'late_minutes', default: 0 })
  lateMinutes: number;

  @Column({ nullable: true })
  note: string;
}
