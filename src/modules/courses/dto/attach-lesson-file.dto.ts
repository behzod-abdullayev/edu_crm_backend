import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AttachLessonFileDto {
  @ApiPropertyOptional({ description: 'Storage key of a previously-uploaded file' })
  @IsOptional()
  @IsString()
  fileKey?: string;
}
