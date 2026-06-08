import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { User } from '../users/entities/user.entity';
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from './dto/notification-template.dto';
import { NotificationResponseDto, NotificationListResponseDto } from './dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@ApiExtraModels(NotificationResponseDto, NotificationListResponseDto)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiResponse({ status: 200, type: NotificationListResponseDto, description: 'Paginated notifications' })
  getAll(
    @CurrentUser() user: User,
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getAll(user.id, tenantId, page, limit);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  @ApiResponse({ status: 200, type: NotificationResponseDto, isArray: true, description: 'Unread notifications' })
  getUnread(@CurrentUser() user: User, @TenantId() tenantId: string) {
    return this.notificationsService.getUnread(user.id, tenantId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllRead(@CurrentUser() user: User, @TenantId() tenantId: string) {
    return this.notificationsService.markAllRead(user.id, tenantId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.remove(id, user.id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List notification templates for tenant' })
  @ApiResponse({ status: 200, description: 'Returns list of templates', isArray: true })
  listTemplates(@TenantId() tenantId: string) {
    return this.notificationsService.listTemplates(tenantId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  createTemplate(@TenantId() tenantId: string, @Body() dto: CreateNotificationTemplateDto) {
    return this.notificationsService.createTemplate(tenantId, dto);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(id, tenantId, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  removeTemplate(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.notificationsService.removeTemplate(id, tenantId);
  }
}
