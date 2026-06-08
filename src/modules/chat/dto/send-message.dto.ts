import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ChatMessageType } from '../../../shared/enums';

export class SendMessageDto {
  @ApiProperty() @IsUUID() roomId: string;
  @ApiProperty({ enum: ChatMessageType }) @IsEnum(ChatMessageType) type: ChatMessageType;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() fileId?: string;
}
