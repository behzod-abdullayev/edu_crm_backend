import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { AuditAction } from '../../../shared/enums';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  @Column({ type: 'jsonb', name: 'old_values', nullable: true })
  oldValues: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'new_values', nullable: true })
  newValues: Record<string, unknown>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'request_id', nullable: true })
  requestId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
