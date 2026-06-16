import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentTeacherItemDto {
  @ApiProperty({ description: 'Teacher profile ID (teachers.id)' })
  id: string;

  @ApiProperty({ description: 'Teacher user account ID (users.id)' })
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  groupName?: string;
}

export class StudentTeacherListDto {
  @ApiProperty({ type: [StudentTeacherItemDto] })
  data: StudentTeacherItemDto[];

  @ApiProperty()
  total: number;
}
