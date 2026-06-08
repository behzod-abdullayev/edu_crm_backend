import { ApiProperty } from '@nestjs/swagger';

export class StudentPerformanceDto {
  @ApiProperty() attendanceRate: number;
  @ApiProperty() homeworkCompletionRate: number;
  @ApiProperty() avgHomeworkScore: number;
  @ApiProperty() avgExamScore: number;
  @ApiProperty() totalExams: number;
}
