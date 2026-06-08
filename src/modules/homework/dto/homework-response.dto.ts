import { ApiProperty } from '@nestjs/swagger';

export class HomeworkAttachmentDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  type: string;
}

export class HomeworkResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  groupId: string | null;

  @ApiProperty({ nullable: true })
  lessonId: string | null;

  @ApiProperty()
  teacherId: string;

  @ApiProperty({ nullable: true })
  dueDate: string | null;

  @ApiProperty()
  maxScore: number;

  @ApiProperty({ type: () => [HomeworkAttachmentDto] })
  attachments: HomeworkAttachmentDto[];

  @ApiProperty()
  isGraded: boolean;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
