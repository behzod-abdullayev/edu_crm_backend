import {
  WebSocketGateway, SubscribeMessage, MessageBody,
  ConnectedSocket, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { ChatService } from './chat.service';

interface JwtPayload {
  sub: string;
  tenantId: string;
}

interface SendMessageData {
  roomId: string;
  content: string;
  type?: string;
}

interface TypingData {
  roomId: string;
  isTyping: boolean;
}

interface RoomData {
  roomId: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private connectedUsers = new Map<string, string>();
  private userTenants = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const authToken = (client.handshake.auth as { token?: string }).token;
      const headerAuth = (client.handshake.headers as { authorization?: string }).authorization;
      const token = authToken || (headerAuth ? headerAuth.split(' ')[1] : undefined);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      this.connectedUsers.set(client.id, payload.sub);
      this.userTenants.set(client.id, payload.tenantId);
      client.join(`user:${payload.sub}`);
      client.join(`tenant:${payload.tenantId}`);
      client.emit('chat.connected', { userId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.connectedUsers.delete(client.id);
    this.userTenants.delete(client.id);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(@MessageBody() data: RoomData, @ConnectedSocket() client: Socket): void {
    client.join(`room:${data.roomId}`);
    client.emit('chat.joined', { roomId: data.roomId });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(@MessageBody() data: RoomData, @ConnectedSocket() client: Socket): void {
    client.leave(`room:${data.roomId}`);
  }

  @SubscribeMessage('send-message')
  handleMessage(@MessageBody() data: SendMessageData, @ConnectedSocket() client: Socket): void {
    const userId = this.connectedUsers.get(client.id);
    this.server.to(`room:${data.roomId}`).emit('chat.message', {
      ...data, senderId: userId, timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: TypingData, @ConnectedSocket() client: Socket): void {
    const userId = this.connectedUsers.get(client.id);
    client.to(`room:${data.roomId}`).emit('chat.typing', { userId, isTyping: data.isTyping });
  }

  @SubscribeMessage('mark-read')
  async handleMarkRead(@MessageBody() data: RoomData, @ConnectedSocket() client: Socket): Promise<void> {
    const userId = this.connectedUsers.get(client.id);
    const tenantId = this.userTenants.get(client.id);
    if (userId && tenantId) {
      await this.chatService.markMessagesRead(data.roomId, userId, tenantId);
      client.emit('chat.read', { roomId: data.roomId });
    }
  }

  sendNotificationToUser(userId: string, notification: Record<string, unknown>): void {
    this.server.to(`user:${userId}`).emit('notification.new', notification);
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: {
    userId: string;
    notification: Record<string, unknown>;
  }): void {
    this.server.to(`user:${payload.userId}`).emit('notification.new', payload.notification);
  }

  sendNotificationRead(userId: string, notificationId: string): void {
    this.server
      .to(`user:${userId}`)
      .emit('notification.read', { id: notificationId });
  }

  sendAllNotificationsRead(userId: string): void {
    this.server
      .to(`user:${userId}`)
      .emit('notification.all_read', { userId });
  }

  sendAttendanceUpdated(
    tenantId: string,
    data: Record<string, unknown>,
  ): void {
    this.server
      .to(`tenant:${tenantId}`)
      .emit('attendance.updated', data);
  }

  sendHomeworkGraded(
    studentUserId: string,
    data: Record<string, unknown>,
  ): void {
    this.server
      .to(`user:${studentUserId}`)
      .emit('homework.graded', data);
  }

  sendHomeworkSubmitted(
    teacherUserId: string,
    data: Record<string, unknown>,
  ): void {
    this.server
      .to(`user:${teacherUserId}`)
      .emit('homework.submitted', data);
  }

  sendPaymentReceived(
    userId: string,
    data: Record<string, unknown>,
  ): void {
    this.server
      .to(`user:${userId}`)
      .emit('payment.received', data);
  }

  sendPaymentOverdue(
    userId: string,
    data: Record<string, unknown>,
  ): void {
    this.server
      .to(`user:${userId}`)
      .emit('payment.overdue', data);
  }

  sendScheduleUpdated(
    tenantId: string,
    data: Record<string, unknown>,
  ): void {
    this.server
      .to(`tenant:${tenantId}`)
      .emit('schedule.updated', data);
  }

  sendExamStarted(
    groupRoomId: string,
    data: Record<string, unknown>,
  ): void {
    this.server
      .to(`group:${groupRoomId}`)
      .emit('exam.started', data);
  }
}
