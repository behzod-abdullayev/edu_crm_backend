import { ApiProperty } from '@nestjs/swagger';

export class DebtInvoiceItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ nullable: true })
  dueDate: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  daysPastDue: number;
}

export class DebtSummaryDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty()
  studentName: string;

  @ApiProperty()
  totalDebt: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  overdueCount: number;

  @ApiProperty()
  pendingCount: number;

  @ApiProperty({ type: [DebtInvoiceItemDto] })
  invoices: DebtInvoiceItemDto[];
}
