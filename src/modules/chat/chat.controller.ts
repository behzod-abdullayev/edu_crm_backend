import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { User } from '../users/entities/user.entity';
import { ConversationDto, ConversationMessageDto } from './dto/conversation.dto';

@ApiTags('Chat')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms/direct')
  @ApiOperation({ summary: 'Create or get direct chat room' })
  getDirectRoom(
    @Body('userId') userId: string,
    @CurrentUser() user: User,
    @TenantId() tenantId: string,
  ) {
    return this.chatService.createOrGetDirectRoom(user.id, userId, tenantId);
  }

  @Post('rooms/group')
  @ApiOperation({ summary: 'Create group chat room' })
  createGroup(
    @Body() body: { name: string; participantIds: string[] },
    @CurrentUser() user: User,
    @TenantId() tenantId: string,
  ) {
    return this.chatService.createGroupRoom(body.name, body.participantIds, tenantId, user.id);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get my chat rooms' })
  getMyRooms(@CurrentUser() user: User, @TenantId() tenantId: string) {
    return this.chatService.getMyRooms(user.id, tenantId);
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Send a message' })
  sendMessage(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: { content: string; type?: string },
    @CurrentUser() user: User,
    @TenantId() tenantId: string,
  ) {
    return this.chatService.sendMessage(roomId, user.id, tenantId, body.content);
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get room messages' })
  getMessages(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getMessages(roomId, tenantId, page, limit);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  deleteMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @TenantId() tenantId: string,
  ) {
    return this.chatService.deleteMessage(id, user.id, tenantId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get my conversations (1:1 and group)' })
  @ApiResponse({ status: 200, type: [ConversationDto] })
  getConversations(@CurrentUser() user: User, @TenantId() tenantId: string) {
    return this.chatService.getConversations(user.id, tenantId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiResponse({ status: 200, type: [ConversationMessageDto] })
  getConversationMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getConversationMessages(id, user.id, tenantId, page, limit);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiResponse({ status: 201, type: ConversationMessageDto })
  sendConversationMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('content') content: string,
    @CurrentUser() user: User,
    @TenantId() tenantId: string,
  ) {
    return this.chatService.sendConversationMessage(id, user.id, tenantId, content);
  }
}
