import { ApiProperty } from '@nestjs/swagger';

export class TeacherStatsDto {
  @ApiProperty() attendanceRate: number;
  @ApiProperty() homeworkGradedRate: number;
}
