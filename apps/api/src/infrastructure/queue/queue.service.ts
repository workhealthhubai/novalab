import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { type JobsOptions, Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import type { GenerateEmployeeReportJobData } from './jobs/generate-employee-report.job';
import type { SendNotificationJobData } from './processors/notifications.processor';
import type { ProcessUploadedDocumentJobData } from './processors/documents.processor';
import { JOBS, QUEUES, type QueueName } from './queue.constants';

export interface QueueStats {
  name: QueueName;
  counts: Record<string, number>;
}

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

/** Typed facade for enqueuing jobs. Domain modules depend on this, not on BullMQ directly. */
@Injectable()
export class QueueService implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
    @InjectQueue(QUEUES.REPORTS) private readonly reportsQueue: Queue,
    @InjectQueue(QUEUES.DOCUMENTS) private readonly documentsQueue: Queue,
    @InjectQueue(QUEUES.SCHEDULED_JOBS) private readonly scheduledJobsQueue: Queue,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QueueService.name);
  }

  async onModuleInit(): Promise<void> {
    // Register repeatable jobs idempotently (BullMQ job schedulers).
    try {
      await this.scheduledJobsQueue.upsertJobScheduler(
        JOBS.EXAMINATION_DUE_REMINDERS,
        { pattern: '0 6 * * *' },
        { name: JOBS.EXAMINATION_DUE_REMINDERS, data: {}, opts: DEFAULT_JOB_OPTIONS },
      );
      await this.scheduledJobsQueue.upsertJobScheduler(
        JOBS.PACS_RECONCILIATION,
        { every: 2 * 60_000 },
        { name: JOBS.PACS_RECONCILIATION, data: {}, opts: DEFAULT_JOB_OPTIONS },
      );
    } catch (error) {
      this.logger.warn({ err: error }, 'Could not register job schedulers (is Redis up?)');
    }
  }

  async enqueueNotification(data: SendNotificationJobData, opts?: JobsOptions): Promise<string> {
    const job = await this.notificationsQueue.add(JOBS.SEND_NOTIFICATION, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...opts,
    });
    return String(job.id);
  }

  async enqueueEmployeeReport(
    data: GenerateEmployeeReportJobData,
    opts?: JobsOptions,
  ): Promise<string> {
    const job = await this.reportsQueue.add(JOBS.GENERATE_EMPLOYEE_REPORT, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...opts,
    });
    return String(job.id);
  }

  async enqueueDocumentProcessing(
    data: ProcessUploadedDocumentJobData,
    opts?: JobsOptions,
  ): Promise<string> {
    const job = await this.documentsQueue.add(JOBS.PROCESS_UPLOADED_DOCUMENT, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...opts,
    });
    return String(job.id);
  }

  async getStats(): Promise<QueueStats[]> {
    const queues: Array<[QueueName, Queue]> = [
      [QUEUES.NOTIFICATIONS, this.notificationsQueue],
      [QUEUES.REPORTS, this.reportsQueue],
      [QUEUES.DOCUMENTS, this.documentsQueue],
      [QUEUES.SCHEDULED_JOBS, this.scheduledJobsQueue],
    ];
    return Promise.all(
      queues.map(async ([name, queue]) => ({
        name,
        counts: await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      })),
    );
  }
}
