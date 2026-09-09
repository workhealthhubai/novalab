import { Injectable } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import type { SendNotificationJobData } from '@/infrastructure/queue/processors/notifications.processor';

/**
 * Domain-facing notification API. Other modules call `notify()`; delivery happens
 * asynchronously in the notifications queue.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly queue: QueueService) {}

  notify(data: SendNotificationJobData): Promise<string> {
    return this.queue.enqueueNotification(data);
  }
}
