import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../../../shared/enums';

export class StudentScheduleEventDto {
  @ApiProperty({ description: 'Schedule entry unique ID' })
  scheduleId: string;

  @ApiProperty({ description: 'Group name', example: 'Group A - Morning' })
  groupName: string;

  @ApiProperty({ description: 'Course name', example: 'English for Beginners' })
  courseName: string;

  @ApiProperty({ description: 'Teacher full name', example: 'John Smith' })
  teacherName: string;

  @ApiProperty({
    enum: DayOfWeek,
    description: 'Day of week',
    example: DayOfWeek.MONDAY,
  })
  dayOfWeek: DayOfWeek;

  @ApiProperty({ description: 'Lesson start time in HH:mm format', example: '09:00' })
  startTime: string;

  @ApiProperty({ description: 'Lesson end time in HH:mm format', example: '10:30' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Classroom or room number', nullable: true })
  room: string | null;
}
