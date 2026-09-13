import type { Job } from 'bullmq';
import { JOBS } from '../queue.constants';
import { dueReminder } from './reminder-policy';
import { ScheduledJobsProcessor } from './scheduled-jobs.processor';

describe('dueReminder', () => {
  const now = new Date('2026-09-12T22:30:00Z');
  it('uses the Istanbul calendar day', () => {
    expect(dueReminder(new Date('2026-09-13'), now)).toEqual({
      dueDate: '2026-09-13',
      daysUntil: 0,
      stage: 0,
    });
  });
  it('catches up to the current threshold after downtime', () => {
    expect(dueReminder(new Date('2026-09-18'), now)?.stage).toBe(7);
    expect(dueReminder(new Date('2026-08-01'), now)?.stage).toBe(-7);
  });
  it('skips missing or distant due dates', () => {
    expect(dueReminder(null, now)).toBeNull();
    expect(dueReminder(new Date('2027-01-01'), now)).toBeNull();
  });
});

describe('ScheduledJobsProcessor', () => {
  afterEach(() => jest.useRealTimers());
  const job = (name: string) => ({ id: 'job-1', name }) as Job;

  function setup() {
    const logger = {
      setContext: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    };
    const prisma = {
      employee: { findMany: jest.fn() },
    };
    const queues = { enqueueNotification: jest.fn().mockResolvedValue('notification-1') };
    const radiology = {
      configuredTenantIds: jest.fn().mockResolvedValue([]),
      retryFailedWorklists: jest.fn().mockResolvedValue({ checked: 0, recovered: 0, failed: 0 }),
      reconcilePacs: jest
        .fn()
        .mockResolvedValue({ checked: 0, linked: 0, ambiguous: 0, waiting: 0 }),
    };
    const processor = new ScheduledJobsProcessor(
      logger as never,
      prisma as never,
      queues as never,
      radiology as never,
    );
    return { logger, prisma, queues, radiology, processor };
  }

  it('queues an idempotent in-app notification at a due-date threshold', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-12T12:00:00Z'));
    const { prisma, queues, processor } = setup();
    prisma.employee.findMany
      .mockResolvedValueOnce([
        {
          id: 'employee-1',
          tenantId: 'tenant-1',
          examinations: [
            { id: 'exam-1', nextExaminationDue: new Date('2026-10-12T00:00:00.000Z') },
          ],
        },
      ])
      .mockResolvedValue([]);

    await processor.process(job(JOBS.EXAMINATION_DUE_REMINDERS));

    expect(prisma.employee.findMany).toHaveBeenCalledTimes(1);
    expect(queues.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        channel: 'in-app',
        template: 'examination-due',
        payload: expect.objectContaining({ examinationId: 'exam-1', daysUntil: 30 }),
      }),
      expect.objectContaining({
        jobId: 'examination-due-exam-1-2026-10-12-30',
      }),
    );
  });

  it('retries worklists and reconciles PACS for every configured tenant', async () => {
    const { radiology, processor } = setup();
    radiology.configuredTenantIds.mockResolvedValue(['tenant-1', 'tenant-2']);

    await processor.process(job(JOBS.PACS_RECONCILIATION));

    expect(radiology.retryFailedWorklists).toHaveBeenCalledTimes(2);
    expect(radiology.reconcilePacs).toHaveBeenCalledTimes(2);
    expect(radiology.reconcilePacs).toHaveBeenCalledWith(
      'tenant-1',
      null,
      25,
      expect.objectContaining({ requestId: 'scheduled-job-1' }),
    );
  });
});
