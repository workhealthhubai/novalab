import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { JOBS, QUEUES } from '../queue.constants';
import {
  type GenerateEmployeeReportJobData,
  handleGenerateEmployeeReport,
} from '../jobs/generate-employee-report.job';

@Processor(QUEUES.REPORTS, { concurrency: 2 })
export class ReportsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(ReportsProcessor.name);
  }

  override async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOBS.GENERATE_EMPLOYEE_REPORT:
        return handleGenerateEmployeeReport(job as Job<GenerateEmployeeReportJobData>, {
          prisma: this.prisma,
          storage: this.storage,
          logger: this.logger,
        });
      default:
        this.logger.warn({ jobId: job.id, name: job.name }, 'Unknown job in reports queue');
        return undefined;
    }
  }
}
