import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  studentName: string;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  courseName: string;

  @ApiProperty()
  startDate: string;

  @ApiProperty({ nullable: true })
  endDate: string | null;

  @ApiProperty({ enum: ['active', 'expired', 'cancelled'] })
  status: string;

  @ApiProperty()
  monthlyAmount: number;

  @ApiProperty()
  currency: string;
}
