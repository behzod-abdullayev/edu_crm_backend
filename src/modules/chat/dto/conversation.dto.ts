import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationDto {
  @ApiProperty() id: string;
  @ApiProperty() participantId: string;
  @ApiProperty() participantName: string;
  @ApiPropertyOptional() participantAvatarUrl?: string;
  @ApiPropertyOptional() lastMessage?: string;
  @ApiPropertyOptional() lastMessageAt?: string;
  @ApiProperty() unreadCount: number;
}

export class ConversationMessageDto {
  @ApiProperty() id: string;
  @ApiProperty() senderId: string;
  @ApiProperty() senderName: string;
  @ApiPropertyOptional() senderAvatarUrl?: string;
  @ApiProperty() content: string;
  @ApiProperty() sentAt: string;
  @ApiPropertyOptional() readAt?: string;
}
