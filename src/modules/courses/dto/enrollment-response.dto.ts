import { ApiProperty } from '@nestjs/swagger';

export class EnrollmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  enrolledAt: string;

  @ApiProperty({ enum: ['active', 'completed', 'dropped'] })
  status: string;

  @ApiProperty({ required: false })
  groupId?: string;
}
