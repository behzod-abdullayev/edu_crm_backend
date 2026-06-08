import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { ChatRoom, ChatMessage } from './entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { ChatMessageType } from '../../shared/enums';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom) private roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMessage) private msgRepo: Repository<ChatMessage>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async createOrGetDirectRoom(userId1: string, userId2: string, tenantId: string): Promise<ChatRoom> {
    const existing = await this.roomRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId AND r.isGroup = false', { tenantId })
      .andWhere(':u1 = ANY(r.participantIds) AND :u2 = ANY(r.participantIds)', { u1: userId1, u2: userId2 })
      .getOne();

    if (existing) return existing;

    const room = this.roomRepo.create({
      tenantId, isGroup: false, roomType: 'direct',
      participantIds: [userId1, userId2],
    });
    return this.roomRepo.save(room);
  }

  async createGroupRoom(name: string, participantIds: string[], tenantId: string, _createdBy: string): Promise<ChatRoom> {
    const room = this.roomRepo.create({
      tenantId, name, isGroup: true, roomType: 'group', participantIds,
    });
    return this.roomRepo.save(room);
  }

  async getMyRooms(userId: string, tenantId: string): Promise<ChatRoom[]> {
    return this.roomRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId AND :userId = ANY(r.participantIds) AND r.isActive = true', { tenantId, userId })
      .orderBy('r.lastMessageAt', 'DESC')
      .getMany();
  }

  async sendMessage(
    roomId: string, senderId: string, tenantId: string,
    content: string, type = ChatMessageType.TEXT, fileUrl?: string,
  ): Promise<ChatMessage> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, tenantId } });
    if (!room) throw new NotFoundException('Chat room not found');

    const msg = this.msgRepo.create({ roomId, senderId, tenantId, content, type, fileUrl });
    const saved = await this.msgRepo.save(msg);
    await this.roomRepo.update(roomId, { lastMessageAt: new Date(), lastMessage: content.slice(0, 100) });
    return saved;
  }

  async getMessages(roomId: string, tenantId: string, page = 1, limit = 50): Promise<{ data: ChatMessage[]; meta: object }> {
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
      .where('roomId = :roomId AND tenantId = :tenantId AND senderId != :userId AND isRead = false', {
        roomId, tenantId, userId,
      })
      .execute();
  }

  async getRoomParticipants(roomId: string, tenantId: string): Promise<User[]> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, tenantId } });
    if (!room) throw new NotFoundException('Chat room not found');

    if (!room.participantIds || room.participantIds.length === 0) return [];

    return this.userRepo.findBy({ id: In(room.participantIds) });
  }

  async updateRoomParticipants(roomId: string, participantIds: string[], tenantId: string): Promise<ChatRoom> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, tenantId } });
    if (!room) throw new NotFoundException('Chat room not found');

    room.participantIds = participantIds;
    return this.roomRepo.save(room);
  }

  async deleteMessage(messageId: string, userId: string, tenantId: string): Promise<void> {
    const message = await this.msgRepo.findOne({ where: { id: messageId, tenantId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('You can only delete your own messages');

    await this.msgRepo.update(messageId, { isDeleted: true, content: 'This message was deleted' });
  }
}
