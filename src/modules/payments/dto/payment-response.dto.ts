import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty({ nullable: true })
  studentName: string | null;

  @ApiProperty({ nullable: true })
  courseId: string | null;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  discountPercent: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled', 'overdue'] })
  status: string;

  @ApiProperty({ enum: ['cash', 'card', 'bank_transfer', 'stripe', 'paypal', 'payme', 'click'] })
  paymentMethod: string;

  @ApiProperty({ nullable: true })
  dueDate: string | null;

  @ApiProperty({ nullable: true })
  paidAt: string | null;

  @ApiProperty({ nullable: true })
  transactionId: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
