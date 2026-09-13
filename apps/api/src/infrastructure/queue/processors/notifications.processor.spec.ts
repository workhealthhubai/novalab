import type { Job } from 'bullmq';
import { JOBS } from '../queue.constants';
import { NotificationsProcessor } from './notifications.processor';

describe('NotificationsProcessor', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-09-12T12:00:00Z')));
  afterEach(() => jest.useRealTimers());
  function setup() {
    const logger = { setContext: jest.fn(), info: jest.fn(), warn: jest.fn() };
    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]) },
      employee: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            examinations: [{ id: 'exam-1', nextExaminationDue: new Date('2026-10-12') }],
          }),
      },
      notification: { upsert: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation((rows: unknown[]) => Promise.all(rows)),
    };
    const processor = new NotificationsProcessor(logger as never, prisma as never);
    const job = {
      id: 'due-1',
      name: JOBS.SEND_NOTIFICATION,
      data: {
        tenantId: 'tenant-1',
        channel: 'in-app',
        recipient: 'tenant-tenant-1',
        template: 'examination-due',
        payload: {
          employeeId: 'employee-1',
          examinationId: 'exam-1',
          dueDate: '2026-10-12',
          daysUntil: 30,
        },
      },
    } as Job;
    return { prisma, processor, job };
  }
  it('persists a separate idempotent delivery per eligible user', async () => {
    const { prisma, processor, job } = setup();
    await processor.process(job);
    expect(prisma.notification.upsert).toHaveBeenCalledTimes(2);
    for (const id of ['user-1', 'user-2'])
      expect(prisma.notification.upsert).toHaveBeenCalledWith({
        where: { sourceKey: `queue:due-1:user:${id}` },
        update: {},
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          recipientUserId: id,
          body: 'Muayene için 30 gün kaldı. Son tarih: 2026-10-12.',
        }),
      });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-1', companyId: null, status: 'ACTIVE' }),
      }),
    );
  });
  it('discards queued reminders superseded by a newer approved examination', async () => {
    const { prisma, processor, job } = setup();
    prisma.employee.findFirst.mockResolvedValue({
      examinations: [{ id: 'exam-2', nextExaminationDue: new Date('2027-01-01') }],
    });
    await processor.process(job);
    expect(prisma.notification.upsert).not.toHaveBeenCalled();
  });
  it('rejects unsupported external delivery without persisting success', async () => {
    const { prisma, processor, job } = setup();
    job.data.channel = 'email';
    await expect(processor.process(job)).rejects.toThrow('provider is not configured');
    expect(prisma.notification.upsert).not.toHaveBeenCalled();
  });
  it('rejects recipients outside the eligible audience', async () => {
    const { prisma, processor, job } = setup();
    job.data.recipient = 'another-user';
    prisma.user.findMany.mockResolvedValue([]);
    await expect(processor.process(job)).rejects.toThrow('not eligible');
    expect(prisma.notification.upsert).not.toHaveBeenCalled();
  });
});
