import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsRepository extends Repository<Notification> {
  constructor(private dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }

  async findForUser(userId: string, tenantId: string, page: number, limit: number): Promise<[Notification[], number]> {
    return this.createQueryBuilder('n')
      .where('n.userId = :userId AND n.tenantId = :tenantId', { userId, tenantId })
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async markAllRead(userId: string, tenantId: string): Promise<void> {
    await this.createQueryBuilder()
      .update()
      .set({ status: 'read' as any, readAt: new Date() })
      .where('userId = :userId AND tenantId = :tenantId AND status != :s', { userId, tenantId, s: 'read' })
      .execute();
  }
}
