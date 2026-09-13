import { dueReminder } from './reminder-policy';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { UnrecoverableError, type Job } from 'bullmq';
import { notificationRecipients } from '@/modules/notifications/notification-audience';
import { PinoLogger } from 'nestjs-pino';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
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
  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.logger.setContext(NotificationsProcessor.name);
  }

  override async process(job: Job<SendNotificationJobData>): Promise<void> {
    if (job.name !== JOBS.SEND_NOTIFICATION) {
      this.logger.warn({ jobId: job.id, name: job.name }, 'Unknown job in notifications queue');
      return;
    }
    if (job.data.channel !== 'in-app')
      throw new UnrecoverableError('Notification delivery provider is not configured');
    if (!job.id) throw new UnrecoverableError('Notification job id is required');
    const broadcast = job.data.recipient === `tenant-${job.data.tenantId}`;
    const recipients = await this.prisma.user.findMany({
      where: {
        ...notificationRecipients(job.data.tenantId, job.data.template),
        ...(broadcast ? {} : { id: job.data.recipient }),
      },
      select: { id: true },
    });
    if (!broadcast && recipients.length === 0)
      throw new UnrecoverableError('Notification recipient is not eligible');
    if (job.data.template === 'examination-due') {
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: String(job.data.payload.employeeId),
          tenantId: job.data.tenantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          examinations: {
            where: { status: 'APPROVED', deletedAt: null },
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
      const latest = employee?.examinations[0];
      const reminder = latest ? dueReminder(latest.nextExaminationDue) : null;
      if (
        !latest ||
        latest.id !== job.data.payload.examinationId ||
        !reminder ||
        reminder.dueDate !== job.data.payload.dueDate
      )
        return;
      job.data.payload = { ...job.data.payload, daysUntil: reminder.daysUntil };
    }
    const message = inAppMessage(job.data);
    await this.prisma.$transaction(
      recipients.map((recipient) =>
        this.prisma.notification.upsert({
          where: { sourceKey: `queue:${job.id}:user:${recipient.id}` },
          create: {
            tenantId: job.data.tenantId,
            recipientUserId: recipient.id,
            sourceKey: `queue:${job.id}:user:${recipient.id}`,
            template: job.data.template,
            title: message.title,
            body: message.body,
            payload: JSON.parse(JSON.stringify(job.data.payload)) as Prisma.InputJsonValue,
          },
          update: {},
        }),
      ),
    );
    this.logger.info(
      { jobId: job.id, tenantId: job.data.tenantId, recipients: recipients.length },
      'In-app notification persisted',
    );
  }
}

function inAppMessage(data: SendNotificationJobData): { title: string; body: string } {
  if (data.template === 'examination-due') {
    const dueDate =
      typeof data.payload.dueDate === 'string' ? data.payload.dueDate : 'belirtilen tarihte';
    const daysUntil = Number(data.payload.daysUntil);
    if (daysUntil < 0)
      return {
        title: 'Periyodik muayene gecikti',
        body: `Muayene tarihi ${dueDate} itibarıyla geçti.`,
      };
    if (daysUntil === 0)
      return { title: 'Periyodik muayene bugün', body: `Muayene son tarihi bugün (${dueDate}).` };
    return {
      title: 'Periyodik muayene yaklaşıyor',
      body: `Muayene için ${daysUntil} gün kaldı. Son tarih: ${dueDate}.`,
    };
  }
  return { title: 'Yeni bildirim', body: data.template };
}
