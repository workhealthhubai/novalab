import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEvents } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import type { AppConfig } from '@/config/configuration';
import { QUEUE_NAMES } from './queue.constants';

/**
 * Subscribes to BullMQ events for every queue and writes one structured log line per
 * lifecycle transition (added, active, completed, failed, stalled, progress).
 */
@Injectable()
export class QueueEventsLogger implements OnModuleInit, OnModuleDestroy {
  private readonly subscriptions: QueueEvents[] = [];

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QueueEventsLogger.name);
  }

  onModuleInit(): void {
    const { connection } = this.config.get('redis', { infer: true });
    const prefix = `${this.config.get('app', { infer: true }).name}:bull`;
    for (const queue of QUEUE_NAMES) {
      const events = new QueueEvents(queue, {
        connection: { ...connection, maxRetriesPerRequest: null },
        prefix,
      });
      events.on('added', ({ jobId, name }) =>
        this.logger.info({ queue, jobId, name }, 'job added'),
      );
      events.on('active', ({ jobId }) => this.logger.info({ queue, jobId }, 'job active'));
      events.on('completed', ({ jobId }) => this.logger.info({ queue, jobId }, 'job completed'));
      events.on('failed', ({ jobId, failedReason }) =>
        this.logger.error({ queue, jobId, failedReason }, 'job failed'),
      );
      events.on('stalled', ({ jobId }) => this.logger.warn({ queue, jobId }, 'job stalled'));
      events.on('progress', ({ jobId, data }) =>
        this.logger.debug({ queue, jobId, progress: data }, 'job progress'),
      );
      events.on('error', (error) =>
        this.logger.warn({ queue, err: error }, 'queue events connection error'),
      );
      this.subscriptions.push(events);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.subscriptions.map((events) => events.close().catch(() => undefined)));
  }
}
