import type { AuthenticatedUser } from '@/common/interfaces';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, CurrentUser, RequirePermissions } from '@/common/decorators';
import { NotificationIdDto } from './dto/notification-id.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() actor: AuthenticatedUser, @Query() query: NotificationQueryDto) {
    return this.notifications.list(actor, query.unreadOnly);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() actor: AuthenticatedUser, @Param() { id }: NotificationIdDto) {
    return this.notifications.markRead(actor, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.markAllRead(actor);
  }

  @Post('test')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Enqueue a test notification (operators only)' })
  async sendTest(@CurrentTenant() tenantId: string, @Body() dto: SendTestNotificationDto) {
    const jobId = await this.notifications.notify({ tenantId, ...dto, payload: dto.payload ?? {} });
    return { jobId };
  }
}
