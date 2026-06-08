import { ApiProperty } from '@nestjs/swagger';

export class StudentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  studentCode: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ nullable: true })
  middleName: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ nullable: true })
  enrollmentDate: string | null;

  @ApiProperty({ nullable: true })
  graduationDate: string | null;

  @ApiProperty({ nullable: true })
  parentName: string | null;

  @ApiProperty({ nullable: true })
  parentPhone: string | null;

  @ApiProperty()
  overallGpa: number;

  @ApiProperty()
  totalAttendancePercent: number;

  @ApiProperty()
  isScholarship: boolean;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  debtAmount: number;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty({ nullable: true })
  branch: string | null;

  @ApiProperty()
  createdAt: string;
}
