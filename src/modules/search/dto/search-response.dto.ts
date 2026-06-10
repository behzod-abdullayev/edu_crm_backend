import { ApiProperty } from '@nestjs/swagger';

export class SearchResultDto {
  @ApiProperty() id: string;
  @ApiProperty() label: string;
  @ApiProperty({ enum: ['students', 'teachers', 'courses'] })
  group: 'students' | 'teachers' | 'courses';
  @ApiProperty() href: string;
  @ApiProperty({ required: false, nullable: true }) meta?: string;
}

export class SearchResponseDto {
  @ApiProperty({ type: [SearchResultDto] }) results: SearchResultDto[];
  @ApiProperty() total: number;
  @ApiProperty() took: number;
}
