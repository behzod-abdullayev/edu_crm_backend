import { ApiProperty } from '@nestjs/swagger';

export class SubmissionAttachmentDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;
}

export class SubmissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  homeworkId: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ nullable: true })
  content: string | null;

  @ApiProperty({ type: () => [SubmissionAttachmentDto] })
  attachments: SubmissionAttachmentDto[];

  @ApiProperty({ enum: ['assigned', 'submitted', 'graded', 'late', 'missing'] })
  status: string;

  @ApiProperty({ nullable: true })
  submittedAt: string | null;

  @ApiProperty({ nullable: true })
  score: number | null;

  @ApiProperty({ nullable: true })
  feedback: string | null;

  @ApiProperty({ nullable: true })
  gradedBy: string | null;

  @ApiProperty({ nullable: true })
  gradedAt: string | null;

  @ApiProperty()
  isLate: boolean;

  @ApiProperty()
  createdAt: string;
}
