import type { AuthenticatedUser } from '@/common/interfaces';
import { notificationInbox } from './notification-audience';
import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import type { SendNotificationJobData } from '@/infrastructure/queue/processors/notifications.processor';

/**
 * Domain-facing notification API. Other modules call `notify()`; delivery happens
 * asynchronously in the notifications queue.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  notify(data: SendNotificationJobData): Promise<string> {
    if (data.channel !== 'in-app')
      throw new ServiceUnavailableException({
        message: 'E-posta/SMS gönderim sağlayıcısı yapılandırılmamış.',
        errorCode: 'NOTIFICATION_CHANNEL_UNAVAILABLE',
      });
    return this.queue.enqueueNotification(data);
  }

  async list(actor: AuthenticatedUser, unreadOnly = false) {
    const where = {
      ...notificationInbox(actor),
      ...(unreadOnly ? { readAt: null } : {}),
    };
    const [items, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      this.prisma.notification.count({ where: { ...notificationInbox(actor), readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(actor: AuthenticatedUser, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, ...notificationInbox(actor), readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const found = await this.prisma.notification.findFirst({
        where: { id, ...notificationInbox(actor) },
      });
      if (!found) throw new NotFoundException('Notification not found');
      return found;
    }
    return this.prisma.notification.findFirstOrThrow({
      where: { id, ...notificationInbox(actor) },
    });
  }

  async markAllRead(actor: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { ...notificationInbox(actor), readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
