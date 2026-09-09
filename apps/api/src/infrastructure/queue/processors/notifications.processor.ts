import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { JOBS, QUEUES } from '../queue.constants';

export interface SendNotificationJobData {
  tenantId: string;
  channel: 'email' | 'sms' | 'in-app';
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
}

@Processor(QUEUES.NOTIFICATIONS, { concurrency: 5 })
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly logger: PinoLogger) {
    super();
    this.logger.setContext(NotificationsProcessor.name);
  }

  override async process(job: Job<SendNotificationJobData>): Promise<void> {
    if (job.name !== JOBS.SEND_NOTIFICATION) {
      this.logger.warn({ jobId: job.id, name: job.name }, 'Unknown job in notifications queue');
      return;
    }
    // TODO(business-logic): integrate e-mail (SMTP/SES), SMS and in-app providers.
    this.logger.info(
      {
        jobId: job.id,
        tenantId: job.data.tenantId,
        channel: job.data.channel,
        template: job.data.template,
      },
      'Notification dispatched (placeholder)',
    );
  }
}
