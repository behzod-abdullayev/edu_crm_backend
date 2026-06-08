import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ChatMessage } from './entities/chat.entity';

@Injectable()
export class ChatRepository extends Repository<ChatMessage> {
  constructor(private dataSource: DataSource) {
    super(ChatMessage, dataSource.createEntityManager());
  }

  async findRoomMessages(roomId: string, page: number, limit: number): Promise<[ChatMessage[], number]> {
    return this.createQueryBuilder('msg')
      .where('msg.roomId = :roomId AND msg.isDeleted = false', { roomId })
      .orderBy('msg.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async markRead(roomId: string, userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE chat_messages SET read_by = array_append(read_by, $1)
       WHERE room_id = $2 AND NOT ($1 = ANY(read_by))`,
      [userId, roomId],
    );
  }
}
