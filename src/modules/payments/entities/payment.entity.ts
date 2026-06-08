import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { PaymentStatus, PaymentMethod } from '../../../shared/enums';
import { Student } from '../../students/entities/student.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('payments')
export class Payment extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'course_id', nullable: true })
  courseId: string;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'invoice_number', unique: false })
  invoiceNumber: string;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'currency', default: 'UZS' })
  currency: string;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMethod, name: 'payment_method', default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  @Column({ name: 'external_payment_id', nullable: true })
  externalPaymentId: string;

  @Column({ name: 'receipt_url', nullable: true })
  receiptUrl: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'received_by', nullable: true })
  receivedBy: string;

  @Column({ name: 'billing_period_start', type: 'date', nullable: true })
  billingPeriodStart: Date;

  @Column({ name: 'billing_period_end', type: 'date', nullable: true })
  billingPeriodEnd: Date;


  @Column({ name: 'stripe_payment_intent_id', nullable: true })
  stripePaymentIntentId: string;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId: string;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurring_interval', type: 'enum', enum: ['monthly', 'annual'], nullable: true })
  recurringInterval: 'monthly' | 'annual' | null;

  @Column({ name: 'next_billing_date', type: 'timestamp', nullable: true })
  nextBillingDate: Date | null;

  @Column({ name: 'refunded_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({ name: 'refund_reason', nullable: true })
  refundReason: string;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @Column({ name: 'invoice_url', nullable: true })
  invoiceUrl: string;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, unknown>;
}

@Entity('payment_plans')
export class PaymentPlan extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'currency', default: 'UZS' })
  currency: string;

  @Column({ name: 'billing_cycle', default: 'monthly' })
  billingCycle: string;

  @Column({ name: 'trial_days', default: 0 })
  trialDays: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', name: 'features', default: [] })
  features: string[];
}
