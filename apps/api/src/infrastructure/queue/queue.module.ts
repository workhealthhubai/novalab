import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { AppConfig } from '@/config/configuration';
import { RadiologyModule } from '@/modules/radiology/radiology.module';
import { DocumentsProcessor } from './processors/documents.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { ReportsProcessor } from './processors/reports.processor';
import { ScheduledJobsProcessor } from './processors/scheduled-jobs.processor';
import { QueueEventsLogger } from './queue-events.logger';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';

/**
 * BullMQ wiring. Workers run inside the API process for now (modular monolith);
 * they can be moved to a dedicated worker process later by importing only the
 * processors there.
 */
@Global()
@Module({
  imports: [
    RadiologyModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const { connection } = config.get('redis', { infer: true });
        return {
          connection: { ...connection, maxRetriesPerRequest: null },
          prefix: `${config.get('app', { infer: true }).name}:bull`,
        };
      },
    }),
    ...QUEUE_NAMES.map((name) => BullModule.registerQueue({ name })),
  ],
  providers: [
    QueueService,
    QueueEventsLogger,
    NotificationsProcessor,
    ReportsProcessor,
    DocumentsProcessor,
    ScheduledJobsProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
