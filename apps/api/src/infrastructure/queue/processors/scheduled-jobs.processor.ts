import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { JOBS, QUEUES } from '../queue.constants';

@Processor(QUEUES.SCHEDULED_JOBS, { concurrency: 1 })
export class ScheduledJobsProcessor extends WorkerHost {
  constructor(private readonly logger: PinoLogger) {
    super();
    this.logger.setContext(ScheduledJobsProcessor.name);
  }

  override async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOBS.EXAMINATION_DUE_REMINDERS:
        // TODO(business-logic): find examinations with nextExaminationDue within N days
        // for every tenant and enqueue notifications.
        this.logger.info({ jobId: job.id }, 'Examination due reminder sweep (placeholder)');
        return;
      default:
        this.logger.warn({ jobId: job.id, name: job.name }, 'Unknown scheduled job');
    }
  }
}
