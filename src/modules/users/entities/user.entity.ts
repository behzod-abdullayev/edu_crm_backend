import { Entity, Column, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { UserRole, UserStatus, Gender, Language } from '../../../shared/enums';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('users')
@Index(['email', 'tenantId'], { unique: true })
@Index(['phone', 'tenantId'])
export class User extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // IMPORTANT: No `name` mapping here — TypeORM created "firstName" and "lastName"
  // columns (camelCase) when synchronize:true ran. Changing these would cause
  // TypeORM to DROP the existing columns and fail to add new ones (NOT NULL error).
  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ nullable: true, name: 'middle_name', length: 100 })
  middleName: string;

  @Column({ unique: false })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ select: false })
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({
    type: 'enum',
    enum: Language,
    default: Language.UZBEK,
  })
  language: Language;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'date_of_birth', nullable: true, type: 'date' })
  dateOfBirth: Date;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_phone_verified', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'two_fa_enabled', default: false })
  twoFaEnabled: boolean;

  @Column({ name: 'two_fa_secret', nullable: true, select: false })
  @Exclude()
  twoFaSecret: string;

  @Column({ name: 'refresh_token', nullable: true, select: false })
  @Exclude()
  refreshToken: string;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'last_login_ip', nullable: true })
  lastLoginIp: string;

  @Column({ name: 'otp_code', nullable: true, select: false })
  @Exclude()
  otpCode: string;

  @Column({ name: 'otp_expires_at', nullable: true, select: false })
  otpExpiresAt: Date;

  @Column({ name: 'custom_role_id', nullable: true })
  customRoleId: string;

  @Column({ name: 'branch', nullable: true })
  branch: string;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, unknown>;

  @Column({ name: 'login_attempts', default: 0 })
  loginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}