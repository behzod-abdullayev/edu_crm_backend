import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional, IsString, IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../../../shared/enums';

export class MarkAttendanceDto {
  @ApiProperty() @IsUUID() scheduleId: string;
  @ApiProperty() @IsUUID() studentId: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) lateMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class BulkAttendanceItemDto {
  @ApiProperty() @IsUUID() studentId: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) lateMinutes?: number;
}

export class BulkMarkAttendanceDto {
  @ApiProperty() @IsUUID() scheduleId: string;
  @ApiProperty({ type: [BulkAttendanceItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => BulkAttendanceItemDto)
  attendances: BulkAttendanceItemDto[];
}

export class QueryAttendanceDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() scheduleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() studentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
}
