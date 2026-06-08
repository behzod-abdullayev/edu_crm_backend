import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus, NotificationChannel } from '../../../shared/enums';
import { PaginationMetaDto } from '../../../shared/dtos/pagination-meta.dto';

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification unique ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Tenant ID this notification belongs to', format: 'uuid' })
  tenantId: string;

  @ApiProperty({ description: 'Recipient user ID', format: 'uuid' })
  userId: string;

  @ApiProperty({ description: 'Notification title', example: 'Homework Graded' })
  title: string;

  @ApiProperty({
    description: 'Notification body text',
    example: 'Your Chapter 3 submission received 85/100.',
  })
  body: string;

  @ApiProperty({
    enum: NotificationChannel,
    description: 'Channel through which this notification was sent',
    example: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel;

  @ApiProperty({
    enum: NotificationStatus,
    description: 'Current read/delivery status of the notification',
    example: NotificationStatus.SENT,
  })
  status: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Event type that triggered this notification',
    nullable: true,
    example: 'homework.graded',
  })
  eventType: string | null;

  @ApiProperty({ description: 'Whether the user has read this notification', example: false })
  isRead: boolean;

  @ApiPropertyOptional({
    description: 'When the user read the notification. Null if unread.',
    nullable: true,
  })
  readAt: string | null;

  @ApiPropertyOptional({
    description: 'When the notification was sent',
    nullable: true,
  })
  sentAt: string | null;

  @ApiPropertyOptional({
    description: 'Deep-link or action URL for the notification',
    nullable: true,
    example: '/homework/uuid',
  })
  actionUrl: string | null;

  @ApiPropertyOptional({
    description: 'Image URL for rich notifications',
    nullable: true,
  })
  imageUrl: string | null;

  @ApiPropertyOptional({
    description: 'Additional structured data payload',
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: { homeworkId: 'uuid', courseId: 'uuid' },
  })
  data: Record<string, unknown> | null;

  @ApiProperty({ description: 'When the notification was created' })
  createdAt: string;
}

export class NotificationListMetaDto {
  @ApiProperty({ description: 'Total number of notifications', example: 150 })
  total: number;

  @ApiProperty({ description: 'Current page number (1-based)', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 8 })
  totalPages: number;
}

export class NotificationListResponseDto {
  @ApiProperty({
    description: 'Array of notification records',
    type: [NotificationResponseDto],
  })
  data: NotificationResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
