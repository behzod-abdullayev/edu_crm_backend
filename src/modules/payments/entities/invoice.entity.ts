import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { Payment } from './payment.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('invoices')
export class Invoice extends AbstractEntity {
  @ApiProperty()
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;
  
  @ApiProperty()
  @Column({ name: 'payment_id' })
  paymentId: string;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @ApiProperty()
  @Column({ name: 'student_id' })
  studentId: string;

  @ApiProperty()
  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @ApiProperty()
  @Column({ name: 'issued_at', type: 'timestamp' })
  issuedAt: Date;

  @ApiProperty()
  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @ApiProperty()
  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @ApiProperty()
  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @ApiProperty()
  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @ApiProperty()
  @Column({ default: 'USD' })
  currency: string;

  @ApiProperty({ enum: InvoiceStatus })
  @Column({ 
    type: 'enum', 
    enum: InvoiceStatus, 
    default: InvoiceStatus.DRAFT 
  })
  status: InvoiceStatus;

  @ApiPropertyOptional()
  @Column({ 
    name: 'pdf_url', 
    type: 'text',     // Xatolikni oldini olish uchun turni aniq yozdik
    nullable: true 
  })
  pdfUrl?: string;    // 'string | null' o'rniga '?' ishlating

  @ApiPropertyOptional()
  @Column({ 
    type: 'text',    // 'varchar' o'rniga 'text' xavfsizroq
    nullable: true 
  })
  notes?: string;    // Bu yerda ham '?' ishlatish TypeORM uchun tushunarliroq
}