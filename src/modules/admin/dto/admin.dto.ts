import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsUUID, IsOptional, IsNumber, IsArray, IsEnum, IsInt,
  IsBoolean, IsDateString, Min,
} from 'class-validator';
import { CourseStatus, PaymentStatus } from '../../../shared/enums';

export class EnrollStudentDto {
  @ApiProperty() @IsUUID() studentId: string;
  @ApiProperty() @IsUUID() courseId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() createPayment?: boolean;
}

export class BulkNotificationDto {
  @ApiProperty({ enum: ['all_students', 'all_teachers', 'group'] }) @IsString() target: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() body: string;
}

export class UpdatePricingDto {
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
}

export class ManageCourseDto {
  @ApiProperty() @IsUUID() courseId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxStudents?: number;
  @ApiPropertyOptional({ enum: CourseStatus }) @IsOptional() @IsEnum(CourseStatus) status?: CourseStatus;
}

export class ManageScheduleDto {
  @ApiPropertyOptional({ description: 'Provide to update existing schedule' })
  @IsOptional() @IsUUID() id?: string;

  @ApiProperty() @IsUUID() groupId: string;
  @ApiProperty() @IsUUID() teacherId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;

  @ApiProperty({ example: '2024-01-15' }) @IsDateString() date: string;
  @ApiProperty({ example: '09:00' }) @IsString() startTime: string;
  @ApiProperty({ example: '11:00' }) @IsString() endTime: string;

  @ApiPropertyOptional() @IsOptional() @IsString() classroom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PaymentMonitoringFilters {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ enum: PaymentStatus }) @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) limit?: number;
}

export class AdminOverviewDto {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalGroups: number;
  monthlyRevenue: number;
  todayAttendanceRate: number;
}

export class OperationalReportDto {
  period: { from: Date; to: Date };
  newEnrollments: number;
  attendanceRate: number;
  homeworkGradedRate: number;
  avgExamScore: number;
  totalRevenue: number;
}

export class DebtReportItemDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  debtAmount: number;
  studentCode: string;
  overduePayments: number;
}

export class ManageGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() id?: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxStudents?: number;
}
