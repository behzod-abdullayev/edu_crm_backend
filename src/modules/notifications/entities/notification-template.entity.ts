import { Entity, Column } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';

@Entity('notification_templates')
export class NotificationTemplate extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  key: string;

  @Column()
  name: string;

  @Column({ name: 'email_subject', nullable: true })
  emailSubject: string;

  @Column({ name: 'email_body', type: 'text', nullable: true })
  emailBody: string;

  @Column({ name: 'sms_body', type: 'text', nullable: true })
  smsBody: string;

  @Column({ name: 'in_app_title', nullable: true })
  inAppTitle: string;

  @Column({ name: 'in_app_body', type: 'text', nullable: true })
  inAppBody: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
