import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsUUID } from 'class-validator';

export class SendBulkDto {
  @ApiProperty({ description: 'Array of user IDs' })
  @IsArray() @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() body: string;
  @ApiProperty() @IsString() type: string;
  @ApiPropertyOptional() @IsOptional() data?: Record<string, any>;
}
