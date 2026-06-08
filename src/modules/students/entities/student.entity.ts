import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { User } from '../../users/entities/user.entity';

@Entity('students')
export class Student extends AbstractEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'student_code', unique: false })
  studentCode: string;

  @Column({ name: 'enrollment_date', type: 'date', nullable: true })
  enrollmentDate: Date;

  @Column({ name: 'graduation_date', type: 'date', nullable: true })
  graduationDate: Date;

  @Column({ name: 'parent_name', nullable: true })
  parentName: string;

  @Column({ name: 'parent_phone', nullable: true })
  parentPhone: string;

  @Column({ name: 'parent_email', nullable: true })
  parentEmail: string;

  @Column({ name: 'emergency_contact', nullable: true })
  emergencyContact: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'overall_gpa' })
  overallGpa: number;

  @Column({ name: 'total_attendance_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalAttendancePercent: number;

  @Column({ name: 'is_scholarship', default: false })
  isScholarship: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'scholarship_percent', default: 0 })
  scholarshipPercent: number;

  @Column({ name: 'balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'debt_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  debtAmount: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'branch', nullable: true })
  branch: string;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, unknown>;
}
