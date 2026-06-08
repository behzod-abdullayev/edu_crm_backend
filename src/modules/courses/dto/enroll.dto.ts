import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class EnrollDto {
  @ApiProperty() @IsUUID() studentId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
}
