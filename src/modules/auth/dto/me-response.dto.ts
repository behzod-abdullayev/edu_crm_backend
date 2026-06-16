import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../shared/enums';

export class MeResponseDto {
  @ApiProperty({ description: 'User unique identifier' })
  id: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @ApiProperty({ enum: UserRole, description: 'User role' })
  role: UserRole;

  @ApiProperty({ enum: UserStatus, description: 'Account status' })
  status: UserStatus;

  @ApiProperty({ description: 'Tenant ID this user belongs to' })
  tenantId: string;

  @ApiProperty({ nullable: true, description: 'Profile picture URL' })
  profilePictureUrl: string | null;

  @ApiProperty({ nullable: true, description: 'Phone number' })
  phone: string | null;

  @ApiProperty({ description: 'Preferred language code', example: 'uz' })
  preferredLanguage: string;

  @ApiProperty({ description: 'Whether 2FA is enabled' })
  twoFactorEnabled: boolean;

  @ApiProperty({
    type: [String],
    description: 'List of permission strings granted to this user based on their role',
    example: ['student.view', 'course.view', 'payment.manage'],
  })
  permissions: string[];

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt: Date;

  @ApiProperty({
    nullable: true,
    description: 'Teacher profile ID (teachers.id), present only for users with the teacher role. Required for /teachers/:id/* endpoints.',
  })
  teacherId: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Student profile ID (students.id), present only for users with the student role. Required for /students/:id/* endpoints.',
  })
  studentId: string | null;
}
