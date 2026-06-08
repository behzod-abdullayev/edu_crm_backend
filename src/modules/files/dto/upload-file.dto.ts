import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() linkedEntityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedEntityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;
}
