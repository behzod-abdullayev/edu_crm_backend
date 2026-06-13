import { ApiProperty } from '@nestjs/swagger';

export class GroupStudentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  profilePictureUrl: string | null;

  @ApiProperty()
  studentCode: string;
}

export class GroupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  courseId: string | null;

  @ApiProperty({ nullable: true })
  courseName: string | null;

  @ApiProperty({ nullable: true })
  teacherId: string | null;

  @ApiProperty({ nullable: true })
  teacherName: string | null;

  @ApiProperty()
  maxStudents: number;

  @ApiProperty()
  currentStudents: number;

  @ApiProperty({ nullable: true })
  startDate: string | null;

  @ApiProperty({ nullable: true })
  endDate: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  branch: string | null;

  @ApiProperty({ nullable: true })
  room: string | null;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: () => [GroupStudentDto] })
  students: GroupStudentDto[];
}
