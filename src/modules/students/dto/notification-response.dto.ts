import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus, NotificationChannel } from '../../../shared/enums';

export class StudentNotificationDto {
  @ApiProperty({ description: 'Notification unique ID' })
  id: string;

  @ApiProperty({ description: 'Recipient user ID' })
  userId: string;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification body text' })
  body: string;

  @ApiProperty({
    enum: NotificationStatus,
    description: 'Notification delivery/read status',
  })
  status: NotificationStatus;

  @ApiProperty({
    enum: NotificationChannel,
    description: 'Delivery channel',
  })
  channel: NotificationChannel;

  @ApiPropertyOptional({
    description: 'Extra data payload',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  data: Record<string, unknown> | null;

  @ApiProperty({ description: 'When the notification was created' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'When the notification was read', nullable: true })
  readAt: Date | null;
}
