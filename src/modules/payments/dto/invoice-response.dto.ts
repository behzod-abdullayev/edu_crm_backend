import { ApiProperty } from '@nestjs/swagger';

export class InvoiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  studentName: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: ['draft', 'sent', 'paid', 'cancelled'] })
  status: string;

  @ApiProperty({ nullable: true })
  dueDate: string | null;

  @ApiProperty({ nullable: true })
  issuedAt: string | null;
}
