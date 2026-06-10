import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BranchResponseDto {
  @ApiProperty({ description: 'Branch unique ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Branch display name', example: 'Tashkent Main Branch' })
  name: string;

  @ApiPropertyOptional({
    description: 'Physical address of the branch',
    nullable: true,
    example: "Amir Temur ko'chasi, 15",
  })
  address: string | null;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    nullable: true,
    example: '+998901234567',
  })
  phone: string | null;

  @ApiPropertyOptional({
    description: 'Manager user ID',
    nullable: true,
    format: 'uuid',
  })
  managerId: string | null;

  @ApiPropertyOptional({
    description: 'Full name of the branch manager',
    nullable: true,
    example: 'Aziz Karimov',
  })
  managerName: string | null;

  @ApiProperty({ description: 'Whether this branch is currently active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Number of enrolled students in this branch', example: 120 })
  studentCount: number;

  @ApiProperty({ description: 'Number of teachers working in this branch', example: 8 })
  teacherCount: number;

  @ApiProperty({ description: 'Number of courses taught by this branch\'s teachers', example: 5 })
  courseCount: number;

  @ApiProperty({ description: 'Revenue from paid payments this calendar month, attributed to this branch', example: 4500000 })
  monthlyRevenue: number;

  @ApiProperty({ description: 'Tenant base currency code (e.g. UZS, USD)', example: 'UZS' })
  currency: string;

  @ApiProperty({ description: 'Branch creation date' })
  createdAt: Date;
}
