import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitHomeworkDto {
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
}

export class GradeHomeworkDto {
  @ApiPropertyOptional() @IsOptional() score?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}
