import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

interface JwtPayload {
  sub: string;
  tenantId: string;
}

interface NotificationCreatedPayload {
  userId: string;
  notification: unknown;
}

interface NotificationReadPayload {
  userId: string;
  notificationId: string;
}

interface NotificationAllReadPayload {
  userId: string;
}

interface AttendanceMarkedPayload {
  studentId: string;
  attendance: unknown;
}

interface HomeworkGradedPayload {
  studentId: string;
  submission: unknown;
}

interface HomeworkSubmittedPayload {
  teacherId: string;
  submission: unknown;
}

interface PaymentReceivedPayload {
  studentId: string;
  payment: unknown;
}

interface ScheduleUpdatedPayload {
  tenantId: string;
  schedule: unknown;
  affectedUserIds: string[];
}

interface ExamStartedPayload {
  studentId: string;
  exam: unknown;
}

interface SocketData {
  userId?: string;
  tenantId?: string;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Map of userId → Set of socketIds (one user can have multiple tabs/devices)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const authToken = (socket.handshake.auth as { token?: string }).token;
      const queryToken = socket.handshake.query['token'] as string | undefined;
      const token = authToken ?? queryToken;

      if (!token) {
        this.logger.warn(`Socket ${socket.id} connected without token — disconnecting`);
        socket.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      const userId = payload.sub;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      await socket.join(`user:${userId}`);

      (socket.data as SocketData) = { userId, tenantId: payload.tenantId };
      socket.emit('notifications.connected', { userId, socketId: socket.id });

      this.logger.log(`User ${userId} connected to notifications gateway (socket: ${socket.id})`);
    } catch {
      this.logger.warn(`Invalid token on notifications socket ${socket.id} — disconnecting`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    const userId = (socket.data as SocketData).userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Socket ${socket.id} disconnected from notifications gateway`);
  }

  sendToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: NotificationCreatedPayload): void {
    this.sendToUser(payload.userId, 'notification.new', payload.notification);
  }

  @OnEvent('notification.marked_read')
  handleNotificationRead(payload: NotificationReadPayload): void {
    this.sendToUser(payload.userId, 'notification.read', { id: payload.notificationId });
  }

  @OnEvent('notification.all_marked_read')
  handleAllNotificationsRead(payload: NotificationAllReadPayload): void {
    this.sendToUser(payload.userId, 'notification.all_read', {});
  }

  @OnEvent('attendance.marked')
  handleAttendanceUpdated(payload: AttendanceMarkedPayload): void {
    this.sendToUser(payload.studentId, 'attendance.updated', payload.attendance);
  }

  @OnEvent('homework.graded')
  handleHomeworkGraded(payload: HomeworkGradedPayload): void {
    this.sendToUser(payload.studentId, 'homework.graded', payload.submission);
  }

  @OnEvent('homework.submitted')
  handleHomeworkSubmitted(payload: HomeworkSubmittedPayload): void {
    this.sendToUser(payload.teacherId, 'homework.submitted', payload.submission);
  }

  @OnEvent('payment.received')
  handlePaymentReceived(payload: PaymentReceivedPayload): void {
    this.sendToUser(payload.studentId, 'payment.received', payload.payment);
  }

  @OnEvent('payment.overdue')
  handlePaymentOverdue(payload: PaymentReceivedPayload): void {
    this.sendToUser(payload.studentId, 'payment.overdue', payload.payment);
  }

  @OnEvent('schedule.updated')
  handleScheduleUpdated(payload: ScheduleUpdatedPayload): void {
    for (const userId of payload.affectedUserIds) {
      this.sendToUser(userId, 'schedule.updated', payload.schedule);
    }
  }

  @OnEvent('exam.started')
  handleExamStarted(payload: ExamStartedPayload): void {
    this.sendToUser(payload.studentId, 'exam.started', payload.exam);
  }
}
