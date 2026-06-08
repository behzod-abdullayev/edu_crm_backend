import { Entity, Column, Index, Unique } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Entity('discounts')
@Unique(['tenantId', 'code'])
export class Discount extends AbstractEntity {
  @ApiProperty()
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @ApiProperty()
  @Column({ length: 50 })
  code: string;

  @ApiProperty()
  @Column({ length: 255 })
  name: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ enum: DiscountType })
  @Column({ type: 'enum', enum: DiscountType })
  type: DiscountType;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @ApiProperty()
  @Column({ name: 'valid_from', type: 'timestamp' })
  validFrom: Date;

  @ApiPropertyOptional()
  @Column({ name: 'valid_until', type: 'timestamp', nullable: true })
  validUntil: Date | null;

  @ApiPropertyOptional()
  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses: number | null;

  @ApiProperty()
  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @ApiProperty()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Array of course UUIDs this discount applies to. Null = all courses.' })
  @Column({ name: 'applicable_course_ids', type: 'jsonb', nullable: true })
  applicableCourseIds: string[] | null;
}
