import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { FileType, StorageProvider } from '../../../shared/enums';
import { User } from '../../users/entities/user.entity';

@Entity('files')
export class File extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'stored_name' })
  storedName: string;

  @Column()
  path: string;

  @Column()
  url: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'enum', enum: FileType, default: FileType.OTHER })
  type: FileType;

  @Column({ type: 'enum', enum: StorageProvider, default: StorageProvider.LOCAL })
  provider: StorageProvider;

  @Column({ name: 'bucket', nullable: true })
  bucket: string;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'related_entity', nullable: true })
  relatedEntity: string;

  @Column({ name: 'related_id', nullable: true })
  relatedId: string;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, unknown>;
}
