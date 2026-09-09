import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, RequirePermissions } from '@/common/decorators';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('test')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Enqueue a test notification (operators only)' })
  async sendTest(@CurrentTenant() tenantId: string, @Body() dto: SendTestNotificationDto) {
    const jobId = await this.notifications.notify({ tenantId, ...dto, payload: dto.payload ?? {} });
    return { jobId };
  }
}
