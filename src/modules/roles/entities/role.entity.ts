import { Entity, Column } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';

@Entity('custom_roles')
export class CustomRole extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', name: 'permissions', default: [] })
  permissions: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;
}
