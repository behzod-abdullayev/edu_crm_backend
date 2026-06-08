import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as Handlebars from 'handlebars';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { User } from '../users/entities/user.entity';
import { NotificationChannel, NotificationStatus } from '../../shared/enums';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';
import { SmsService } from './sms.service';
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from './dto/notification-template.dto';
import { InjectRepository } from '@nestjs/typeorm';

export interface SendNotificationPayload {
  userId: string;
  tenantId?: string;
  channel: NotificationChannel;
  event?: string;
  title?: string;
  body?: string;
  email?: string;
  phone?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(NotificationTemplate) private templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    private configService: ConfigService,
    private mailService: MailService,
    private smsService: SmsService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getTemplate(tenantId: string, key: string): Promise<NotificationTemplate | null> {
    return this.templateRepo.findOne({ where: { tenantId, key, isActive: true } });
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    const n = this.notifRepo.create(data);
    const saved = await this.notifRepo.save(n);
    this.eventEmitter.emit('notification.created', { userId: saved.userId, notification: saved });
    return saved;
  }

  async send(payload: SendNotificationPayload): Promise<Notification> {
    let title = payload.title || 'Notification';
    let body = payload.body || '';

    if (payload.event && payload.tenantId) {
      const template = await this.getTemplate(payload.tenantId, payload.event);
      if (template) {
        if (template.inAppTitle) {
          title = Handlebars.compile(template.inAppTitle)(payload.data || {});
        }
        if (template.inAppBody) {
          body = Handlebars.compile(template.inAppBody)(payload.data || {});
        }
      }
    }

    const notif = await this.create({
      userId: payload.userId,
      tenantId: payload.tenantId || '',
      title,
      body,
      channel: payload.channel,
      eventType: payload.event,
      data: payload.data || {},
      status: NotificationStatus.PENDING,
    });

    try {
      if (payload.channel === NotificationChannel.IN_APP) {
        await this.notifRepo.update(notif.id, { status: NotificationStatus.SENT, sentAt: new Date() });
      } else if (
        payload.channel === NotificationChannel.EMAIL ||
        payload.channel === NotificationChannel.SMS
      ) {
        const user = await this.usersRepo.findOne({ where: { id: payload.userId } });

        if (payload.channel === NotificationChannel.EMAIL) {
          const email = payload.email || user?.email;
          if (email) {
            await this.mailService.sendPlainEmail(email, title, body);
            await this.notifRepo.update(notif.id, { status: NotificationStatus.SENT, sentAt: new Date() });
          }
        }

        if (payload.channel === NotificationChannel.SMS) {
          const phone = payload.phone || user?.phone;
          if (phone) {
            await this.smsService.send(phone, body);
            await this.notifRepo.update(notif.id, { status: NotificationStatus.SENT, sentAt: new Date() });
          }
        }
      }
    } catch (err) {
      await this.notifRepo.update(notif.id, {
        status: NotificationStatus.FAILED,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
    }
    return notif;
  }

  async createBulk(items: Partial<Notification>[]): Promise<Notification[]> {
    const notifications = this.notifRepo.create(items);
    return this.notifRepo.save(notifications);
  }

  async getUnread(userId: string, tenantId: string): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { userId, tenantId, isRead: false },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('id = :id AND userId = :userId', { id, userId })
      .execute();
    this.eventEmitter.emit('notification.marked_read', { userId, notificationId: id });
  }

  async markAllRead(userId: string, tenantId: string): Promise<void> {
    await this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND tenantId = :tenantId AND isRead = false', { userId, tenantId })
      .execute();
    this.eventEmitter.emit('notification.all_marked_read', { userId });
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const notification = await this.notifRepo.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with id "${id}" not found for this user`,
      );
    }

    await this.notifRepo.softRemove(notification);

    return { message: 'Notification deleted successfully' };
  }

  async deleteById(notificationId: string, userId: string, tenantId: string): Promise<void> {
    const notification = await this.notifRepo.findOne({
      where: { id: notificationId, tenantId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException("You cannot delete another user's notification");
    }
    await this.notifRepo.softRemove(notification);
  }

  async getAll(
    userId: string,
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Notification[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const [data, total] = await this.notifRepo.findAndCount({
      where: { userId, tenantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async listTemplates(tenantId: string): Promise<NotificationTemplate[]> {
    return this.templateRepo.find({ where: { tenantId }, order: { key: 'ASC' } });
  }

  async createTemplate(tenantId: string, dto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const tpl = this.templateRepo.create({ ...dto, tenantId });
    return this.templateRepo.save(tpl);
  }

  async updateTemplate(
    id: string,
    tenantId: string,
    dto: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    const tpl = await this.templateRepo.findOne({ where: { id, tenantId } });
    if (!tpl) throw new NotFoundException('Notification template not found');
    Object.assign(tpl, dto);
    return this.templateRepo.save(tpl);
  }

  async removeTemplate(id: string, tenantId: string): Promise<void> {
    const tpl = await this.templateRepo.findOne({ where: { id, tenantId } });
    if (!tpl) throw new NotFoundException('Notification template not found');
    await this.templateRepo.softDelete(id);
  }

  @OnEvent('notification.send')
  async handleNotificationEvent(payload: SendNotificationPayload): Promise<void> {
    await this.send(payload);
  }

  @OnEvent('notification.bulk')
  async handleBulkNotificationEvent(payloads: SendNotificationPayload[]): Promise<void> {
    await Promise.allSettled(payloads.map((p) => this.send(p)));
  }
}
