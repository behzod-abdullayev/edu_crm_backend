import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { ChatRoom, ChatMessage } from './entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { ChatMessageType } from '../../shared/enums';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationDto, ConversationMessageDto } from './dto/conversation.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom) private roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMessage) private msgRepo: Repository<ChatMessage>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async createOrGetDirectRoom(
    userId1: string,
    userId2: string,
    tenantId: string,
  ): Promise<ChatRoom> {
    const existing = await this.roomRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId AND r.isGroup = false', { tenantId })
      .andWhere(
        ":u1 = ANY(string_to_array(r.participantIds, ',')) AND :u2 = ANY(string_to_array(r.participantIds, ','))",
        { u1: userId1, u2: userId2 },
      )
      .getOne();

    if (existing) return existing;

    const room = this.roomRepo.create({
      tenantId,
      isGroup: false,
      roomType: 'direct',
      participantIds: [userId1, userId2],
    });
    return this.roomRepo.save(room);
  }

  async createGroupRoom(
    name: string,
    participantIds: string[],
    tenantId: string,
    _createdBy: string,
  ): Promise<ChatRoom> {
    const room = this.roomRepo.create({
      tenantId,
      name,
      isGroup: true,
      roomType: 'group',
      participantIds,
    });
    return this.roomRepo.save(room);
  }

  async getMyRooms(userId: string, tenantId: string): Promise<ChatRoom[]> {
    return this.roomRepo
      .createQueryBuilder('r')
      .where(
        "r.tenantId = :tenantId AND :userId = ANY(string_to_array(r.participantIds, ',')) AND r.isActive = true",
        { tenantId, userId },
      )
      .orderBy('r.lastMessageAt', 'DESC')
      .getMany();
  }

  async sendMessage(
    roomId: string,
    senderId: string,
    tenantId: string,
    content: string,
    type = ChatMessageType.TEXT,
    fileUrl?: string,
  ): Promise<ChatMessage> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, tenantId } });
    if (!room) throw new NotFoundException('Chat room not found');

    const msg = this.msgRepo.create({ roomId, senderId, tenantId, content, type, fileUrl });
    const saved = await this.msgRepo.save(msg);
    await this.roomRepo.update(roomId, {
      lastMessageAt: new Date(),
      lastMessage: content.slice(0, 100),
    });
    return saved;
  }

  async getMessages(
    roomId: string,
    tenantId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: ChatMessage[]; meta: object }> {
    const [data, total] = await this.msgRepo.findAndCount({
      where: { roomId, tenantId, isDeleted: false },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: data.reverse(), meta: { total, page, limit } };
  }

  async markMessagesRead(roomId: string, userId: string, tenantId: string): Promise<void> {
    await this.msgRepo
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .where(
        'roomId = :roomId AND tenantId = :tenantId AND senderId != :userId AND isRead = false',
        {
          roomId,
          tenantId,
          userId,
        },
      )
      .execute();
  }

  async getRoomParticipants(roomId: string, tenantId: string): Promise<User[]> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, tenantId } });
    if (!room) throw new NotFoundException('Chat room not found');

    if (!room.participantIds || room.participantIds.length === 0) return [];

    return this.userRepo.findBy({ id: In(room.participantIds) });
  }

  async updateRoomParticipants(
    roomId: string,
    participantIds: string[],
    tenantId: string,
  ): Promise<ChatRoom> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, tenantId } });
    if (!room) throw new NotFoundException('Chat room not found');

    room.participantIds = participantIds;
    return this.roomRepo.save(room);
  }

  async deleteMessage(messageId: string, userId: string, tenantId: string): Promise<void> {
    const message = await this.msgRepo.findOne({ where: { id: messageId, tenantId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId)
      throw new ForbiddenException('You can only delete your own messages');

    await this.msgRepo.update(messageId, { isDeleted: true, content: 'This message was deleted' });
  }

  /** Conversation list for the current user, covering both 1:1 and group rooms. */
  async getConversations(userId: string, tenantId: string): Promise<ConversationDto[]> {
    const rooms = await this.getMyRooms(userId, tenantId);

    return Promise.all(
      rooms.map(async (room) => {
        let participantId: string;
        let participantName: string;
        let participantAvatarUrl: string | undefined;

        if (room.isGroup) {
          participantId = room.id;
          participantName = room.name ?? 'Group chat';
        } else {
          const otherId = room.participantIds.find((id) => id !== userId) ?? room.participantIds[0];
          const other = otherId ? await this.userRepo.findOne({ where: { id: otherId } }) : null;
          participantId = otherId ?? room.id;
          participantName = other ? `${other.firstName} ${other.lastName}` : 'Unknown user';
          participantAvatarUrl = other?.avatarUrl ?? undefined;
        }

        const unreadCount = await this.msgRepo
          .createQueryBuilder('m')
          .where(
            'm.roomId = :roomId AND m.tenantId = :tenantId AND m.senderId != :userId AND m.isRead = false AND m.isDeleted = false',
            { roomId: room.id, tenantId, userId },
          )
          .getCount();

        return {
          id: room.id,
          participantId,
          participantName,
          participantAvatarUrl,
          lastMessage: room.lastMessage ?? undefined,
          lastMessageAt: room.lastMessageAt ? room.lastMessageAt.toISOString() : undefined,
          unreadCount,
        };
      }),
    );
  }

  /** Messages for a conversation, shaped for the chat UI (sender display info included). */
  async getConversationMessages(
    roomId: string,
    userId: string,
    tenantId: string,
    page = 1,
    limit = 50,
  ): Promise<ConversationMessageDto[]> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, tenantId } });
    if (!room) throw new NotFoundException('Conversation not found');
    if (!room.participantIds.includes(userId))
      throw new ForbiddenException('You are not a participant of this conversation');

    const { data } = await this.getMessages(roomId, tenantId, page, limit);
    return data.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : 'Unknown user',
      senderAvatarUrl: m.sender?.avatarUrl ?? undefined,
      content: m.content,
      sentAt: m.createdAt.toISOString(),
      readAt: m.readAt ? m.readAt.toISOString() : undefined,
    }));
  }

  /** Send a message in a conversation, returning it shaped for the chat UI. */
  async sendConversationMessage(
    roomId: string,
    userId: string,
    tenantId: string,
    content: string,
  ): Promise<ConversationMessageDto> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, tenantId } });
    if (!room) throw new NotFoundException('Conversation not found');
    if (!room.participantIds.includes(userId))
      throw new ForbiddenException('You are not a participant of this conversation');

    const saved = await this.sendMessage(roomId, userId, tenantId, content);
    const sender = await this.userRepo.findOne({ where: { id: userId } });

    return {
      id: saved.id,
      senderId: userId,
      senderName: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown user',
      senderAvatarUrl: sender?.avatarUrl ?? undefined,
      content: saved.content,
      sentAt: saved.createdAt.toISOString(),
    };
  }
}
