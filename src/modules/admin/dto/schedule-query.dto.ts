import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString } from 'class-validator';

export class AdminScheduleQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  courseId?: string;
}
