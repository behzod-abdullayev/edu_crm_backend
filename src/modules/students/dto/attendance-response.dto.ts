import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../../../shared/enums';

export class AttendanceResponseDto {
  @ApiProperty({ description: 'Attendance record ID' })
  id: string;

  @ApiProperty({ description: 'Student user ID' })
  studentId: string;

  @ApiProperty({ description: 'Related schedule/lesson ID' })
  scheduleId: string;

  @ApiProperty({
    enum: AttendanceStatus,
    description: 'Attendance status',
    example: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @ApiProperty({ description: 'Date of attendance in ISO format', example: '2024-03-15' })
  date: string;

  @ApiPropertyOptional({ description: 'Teacher note about this attendance', nullable: true })
  note: string | null;

  @ApiProperty({ description: 'Record creation timestamp' })
  createdAt: Date;
}
