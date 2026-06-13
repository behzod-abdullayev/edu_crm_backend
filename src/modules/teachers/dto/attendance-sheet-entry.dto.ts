import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttendanceSheetEntryDto {
  @ApiProperty()
  studentId: string;

  @ApiPropertyOptional()
  studentName?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  note?: string;
}
