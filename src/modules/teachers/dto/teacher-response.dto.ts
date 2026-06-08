import { ApiProperty } from '@nestjs/swagger';

export class TeacherResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ nullable: true })
  teacherCode: string | null;

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
  specialization: string | null;

  @ApiProperty({ type: [String] })
  subjects: string[];

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty()
  experienceYears: number;

  @ApiProperty({ nullable: true })
  hireDate: string | null;

  @ApiProperty()
  maxStudents: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty({ nullable: true })
  branch: string | null;

  @ApiProperty()
  createdAt: string;
}
