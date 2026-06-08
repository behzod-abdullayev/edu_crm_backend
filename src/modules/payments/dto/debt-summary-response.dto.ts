import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OverduePaymentItemDto {
  @ApiProperty({ description: 'Payment unique ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Amount owed in base currency units', example: 250000 })
  amount: number;

  @ApiPropertyOptional({
    description: 'Payment due date in ISO format',
    nullable: true,
    example: '2024-03-01T00:00:00.000Z',
  })
  dueDate: string | null;

  @ApiPropertyOptional({
    description: 'Title of the related course',
    nullable: true,
    example: 'English for Beginners',
  })
  courseTitle: string | null;
}

export class DebtSummaryResponseDto {
  @ApiProperty({ description: 'Student unique ID', format: 'uuid' })
  studentId: string;

  @ApiProperty({
    description: 'Total outstanding debt in base currency units',
    example: 750000,
  })
  totalDebt: number;

  @ApiProperty({
    description: 'Number of overdue or pending payments',
    example: 3,
  })
  overdueCount: number;

  @ApiProperty({
    description: 'Breakdown of each overdue/pending payment',
    type: [OverduePaymentItemDto],
  })
  overduePayments: OverduePaymentItemDto[];
}
