import { ApiProperty } from '@nestjs/swagger';

export class CourseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  shortDescription: string | null;

  @ApiProperty({ nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ nullable: true })
  coverUrl: string | null;

  @ApiProperty({ enum: ['draft', 'published', 'archived'] })
  status: string;

  @ApiProperty({ nullable: true })
  teacherId: string | null;

  @ApiProperty({ nullable: true })
  teacherName: string | null;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  durationHours: number;

  @ApiProperty()
  maxStudents: number;

  @ApiProperty()
  enrolledCount: number;

  @ApiProperty({ nullable: true })
  categoryId: string | null;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  language: string;

  @ApiProperty()
  difficultyLevel: string;

  @ApiProperty()
  certificateEnabled: boolean;

  @ApiProperty()
  passingScore: number;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
