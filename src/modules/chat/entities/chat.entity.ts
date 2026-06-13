import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { ChatMessageType } from '../../../shared/enums';
import { User } from '../../users/entities/user.entity';

@Entity('chat_rooms')
export class ChatRoom extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ name: 'is_group', default: false })
  isGroup: boolean;

  @Column({ name: 'room_type', default: 'direct' })
  roomType: string;

  @Column({ type: 'simple-array', name: 'participant_ids', default: '' })
  participantIds: string[];

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ name: 'last_message', nullable: true })
  lastMessage: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}

@Entity('chat_messages')
export class ChatMessage extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => ChatRoom)
  @JoinColumn({ name: 'room_id' })
  room: ChatRoom;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'enum', enum: ChatMessageType, default: ChatMessageType.TEXT })
  type: ChatMessageType;

  @Column({ name: 'file_url', nullable: true })
  fileUrl: string;

  @Column({ name: 'file_name', nullable: true })
  fileName: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ name: 'reply_to_id', nullable: true })
  replyToId: string;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;
}
