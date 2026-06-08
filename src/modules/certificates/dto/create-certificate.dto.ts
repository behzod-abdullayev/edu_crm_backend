import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class CreateCertificateDto {
  @ApiProperty() @IsUUID() studentId: string;
  @ApiProperty() @IsUUID() courseId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}
