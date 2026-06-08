import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class HomeworkAttachmentDto {
  @ApiProperty({ description: 'Attachment file name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'URL of uploaded attachment' })
  @IsString()
  @IsNotEmpty()
  url: string;
}

export class SubmitHomeworkDto {
  @ApiProperty({ description: 'Student answer/submission text' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false, description: 'Attached files', type: [HomeworkAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeworkAttachmentDto)
  attachments?: HomeworkAttachmentDto[];
}
