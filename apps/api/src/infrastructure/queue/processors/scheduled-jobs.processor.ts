import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { RadiologyService } from '@/modules/radiology/radiology.service';
import { JOBS, QUEUES } from '../queue.constants';
import { QueueService } from '../queue.service';

import { dueReminder } from './reminder-policy';
const RETAIN_REMINDER_JOBS_SECONDS = 180 * 24 * 60 * 60;

@Processor(QUEUES.SCHEDULED_JOBS, { concurrency: 1 })
export class ScheduledJobsProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
    private readonly radiology: RadiologyService,
  ) {
    super();
    this.logger.setContext(ScheduledJobsProcessor.name);
  }

  override async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOBS.EXAMINATION_DUE_REMINDERS:
        await this.examinationDueReminders(job);
        return;
      case JOBS.PACS_RECONCILIATION:
        await this.pacsReconciliation(job);
        return;
      default:
        this.logger.warn({ jobId: job.id, name: job.name }, 'Unknown scheduled job');
    }
  }

  private async examinationDueReminders(job: Job): Promise<void> {
    let queued = 0;
    let cursor: string | undefined;
    for (;;) {
      const employees = await this.prisma.employee.findMany({
        where: { status: 'ACTIVE', deletedAt: null, tenant: { status: 'ACTIVE', deletedAt: null } },
        orderBy: { id: 'asc' },
        take: 250,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          tenantId: true,
          examinations: {
            where: { status: 'APPROVED', deletedAt: null },
            // Do not filter due dates before choosing the newest exam: a newer exam with no
            // due date also supersedes an old reminder.
            orderBy: [
              { performedAt: { sort: 'desc', nulls: 'last' } },
              { approvedAt: 'desc' },
              { id: 'desc' },
            ],
            take: 1,
            select: { id: true, nextExaminationDue: true },
          },
        },
      });
      for (const employee of employees) {
        const examination = employee.examinations[0];
        const reminder = examination ? dueReminder(examination.nextExaminationDue) : null;
        if (!examination || !reminder) continue;
        await this.queues.enqueueNotification(
          {
            tenantId: employee.tenantId,
            channel: 'in-app',
            recipient: `tenant-${employee.tenantId}`,
            template: 'examination-due',
            payload: {
              examinationId: examination.id,
              employeeId: employee.id,
              dueDate: reminder.dueDate,
              daysUntil: reminder.daysUntil,
            },
          },
          {
            jobId: `examination-due-${examination.id}-${reminder.dueDate}-${reminder.stage}`,
            removeOnComplete: { age: RETAIN_REMINDER_JOBS_SECONDS, count: 100_000 },
          },
        );
        queued++;
      }
      if (employees.length < 250) break;
      cursor = employees.at(-1)!.id;
    }
    this.logger.info({ jobId: job.id, queued }, 'Examination due reminder sweep completed');
  }

  private async pacsReconciliation(job: Job): Promise<void> {
    const tenantIds = await this.radiology.configuredTenantIds();
    const totals = { tenants: tenantIds.length, linked: 0, recovered: 0, failedTenants: 0 };
    for (const tenantId of tenantIds) {
      try {
        const ctx = { requestId: `scheduled-${job.id ?? 'pacs'}` };
        const retry = await this.radiology.retryFailedWorklists(tenantId, 25, ctx);
        const reconcile = await this.radiology.reconcilePacs(tenantId, null, 25, ctx);
        totals.recovered += retry.recovered;
        totals.linked += reconcile.linked;
      } catch (error) {
        totals.failedTenants += 1;
        this.logger.warn({ err: error, tenantId }, 'Tenant PACS reconciliation failed');
      }
    }
    this.logger.info({ jobId: job.id, ...totals }, 'PACS reconciliation sweep completed');
  }
}
