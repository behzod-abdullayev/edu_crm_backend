import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional, IsString, IsArray, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../../../shared/enums';

export class AttendanceMarkEntryDto {
  @ApiProperty() @IsUUID() studentId: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class MarkGroupAttendanceDto {
  @ApiProperty() @IsUUID() groupId: string;
  @ApiProperty({ example: '2024-01-15' }) @IsDateString() date: string;
  @ApiProperty({ type: [AttendanceMarkEntryDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => AttendanceMarkEntryDto)
  entries: AttendanceMarkEntryDto[];
}
