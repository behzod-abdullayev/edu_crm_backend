import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { User } from '../../users/entities/user.entity';

@Entity('teachers')
export class Teacher extends AbstractEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'teacher_code', nullable: true })
  teacherCode: string;

  @Column({ name: 'specialization', nullable: true })
  specialization: string;

  @Column({ type: 'simple-array', name: 'subjects', default: '' })
  subjects: string[];

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio: string;

  @Column({ name: 'experience_years', default: 0 })
  experienceYears: number;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: Date;

  @Column({ name: 'contract_end_date', type: 'date', nullable: true })
  contractEndDate: Date;

  @Column({ name: 'salary', type: 'decimal', precision: 12, scale: 2, nullable: true })
  salary: number;

  @Column({ name: 'salary_currency', default: 'UZS' })
  salaryCurrency: string;

  @Column({ name: 'payment_type', default: 'monthly' })
  paymentType: string;

  @Column({ name: 'max_students', default: 30 })
  maxStudents: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, name: 'rating', default: 0 })
  rating: number;

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews: number;

  @Column({ name: 'branch', nullable: true })
  branch: string;

  @Column({ type: 'jsonb', name: 'availability', default: {} })
  availability: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, unknown>;

}
