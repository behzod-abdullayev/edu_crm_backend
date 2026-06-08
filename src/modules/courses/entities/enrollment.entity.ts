import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { Student } from '../../students/entities/student.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('enrollments')
@Unique(['studentId', 'courseId'])
export class Enrollment extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

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

  @Column({ name: 'enrolled_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  enrolledAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'progress_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercent: number;

  @Column({ name: 'completed_lessons', default: 0 })
  completedLessons: number;

  @Column({ name: 'total_lessons', default: 0 })
  totalLessons: number;

  @Column({ name: 'final_grade', type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalGrade: number;

  @Column({ name: 'certificate_issued', default: false })
  certificateIssued: boolean;

  @Column({ name: 'certificate_url', nullable: true })
  certificateUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'payment_status', default: 'pending' })
  paymentStatus: string;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;
}
