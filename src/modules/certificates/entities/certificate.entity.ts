import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { Student } from '../../students/entities/student.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('certificates')
export class Certificate extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'certificate_number', unique: false })
  certificateNumber: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'course_id' })
  courseId: string;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'issued_at', type: 'date', default: () => 'CURRENT_DATE' })
  issuedAt: Date;

  @Column({ name: 'issued_by' })
  issuedBy: string;

  @Column({ name: 'file_url', nullable: true })
  fileUrl: string;

  @Column({ name: 'qr_code_url', nullable: true })
  qrCodeUrl: string;

  @Column({ name: 'grade', type: 'decimal', precision: 5, scale: 2, nullable: true })
  grade: number;

  @Column({ name: 'grade_label', nullable: true })
  gradeLabel: string;

  @Column({ name: 'is_valid', default: true })
  isValid: boolean;

  @Column({ name: 'verification_code', nullable: true })
  verificationCode: string;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt: Date;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, unknown>;
}
