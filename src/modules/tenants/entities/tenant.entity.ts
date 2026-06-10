import { Entity, Column, OneToMany, Index } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { SubscriptionPlan, SubscriptionStatus } from '../../../shared/enums';

export interface TenantFeatureFlags {
  paymentsEnabled: boolean;
  chatEnabled: boolean;
  certificatesEnabled: boolean;
  examEngineEnabled: boolean;
  analyticsEnabled: boolean;
  multiCurrencyEnabled: boolean;
}

@Entity('tenants')
@Index(['slug'], { unique: true })
export class Tenant extends AbstractEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  slug: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl: string;

  @Column({ nullable: true, name: 'favicon_url' })
  faviconUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  theme: Record<string, string>;

  @Column({ name: 'primary_color', nullable: true })
  primaryColor: string;

  @Column({ name: 'secondary_color', nullable: true })
  secondaryColor: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ name: 'default_language', default: 'en' })
  defaultLanguage: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    name: 'subscription_plan',
    default: SubscriptionPlan.FREE,
  })
  subscriptionPlan: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    name: 'subscription_status',
    default: SubscriptionStatus.TRIAL,
  })
  subscriptionStatus: SubscriptionStatus;

  @Column({ name: 'subscription_expires_at', nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ name: 'max_students', default: 100 })
  maxStudents: number;

  @Column({ name: 'max_teachers', default: 10 })
  maxTeachers: number;

  @Column({ name: 'max_storage_gb', default: 5 })
  maxStorageGb: number;

  @Column({
    name: 'feature_flags',
    type: 'jsonb',
    default: {
      paymentsEnabled: true,
      chatEnabled: true,
      certificatesEnabled: true,
      examEngineEnabled: true,
      analyticsEnabled: true,
      multiCurrencyEnabled: false,
    },
  })
  featureFlags: TenantFeatureFlags;

  @Column({ type: 'jsonb', name: 'settings', default: {} })
  settings: Record<string, unknown>;

  @Column({ type: 'simple-array', name: 'branches', default: [] })
  branches: string[];

  // Unified base currency for the tenant (e.g. 'UZS', 'USD'). Used across
  // HR payroll and the Finance module so figures are displayed consistently.
  @Column({ length: 10, default: 'UZS' })
  currency: string;
}
