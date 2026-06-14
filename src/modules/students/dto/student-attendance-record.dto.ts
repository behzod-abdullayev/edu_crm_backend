import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../../../shared/enums';

export class StudentAttendanceRecordDto {
  @ApiProperty({ description: 'Attendance record ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Student ID', format: 'uuid' })
  studentId: string;

  @ApiProperty({ description: 'Course ID for this attendance record', format: 'uuid' })
  courseId: string;

  @ApiPropertyOptional({ description: 'Course title', example: 'English for Beginners' })
  courseName?: string;

  @ApiPropertyOptional({ description: 'Name of the teacher who marked attendance', example: 'John Smith' })
  teacherName?: string;

  @ApiProperty({ description: 'Date of attendance in ISO format', example: '2024-03-15' })
  date: string;

  @ApiProperty({
    enum: AttendanceStatus,
    description: 'Attendance status',
    example: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Note about this attendance record' })
  note?: string;
}
