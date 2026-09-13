import { PERMISSIONS } from '@osgb/shared-types';
import type { AuthenticatedUser } from '@/common/interfaces';
import { NotificationsService } from './notifications.service';
import { notificationInbox } from './notification-audience';

describe('personal notification inbox', () => {
  const actor = {
    id: 'user-1',
    tenantId: 'tenant-1',
    permissions: [PERMISSIONS.EXAMINATIONS_READ],
  } as AuthenticatedUser;
  it('scopes ownership and template access, including permission removal', () => {
    expect(notificationInbox(actor)).toEqual({
      tenantId: 'tenant-1',
      recipientUserId: 'user-1',
      OR: [{ template: 'examination-due' }],
    });
    expect(notificationInbox({ ...actor, permissions: [] }).OR).toEqual([]);
  });
  it('does not mark another user delivery as read', async () => {
    const prisma = {
      notification: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new NotificationsService({} as never, prisma as never);
    await expect(service.markRead(actor, 'other-delivery')).rejects.toThrow(
      'Notification not found',
    );
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'other-delivery', ...notificationInbox(actor), readAt: null },
      }),
    );
  });
  it('marks all read only within the caller inbox', async () => {
    const prisma = { notification: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) } };
    const service = new NotificationsService({} as never, prisma as never);
    await expect(service.markAllRead(actor)).resolves.toEqual({ updated: 2 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ...notificationInbox(actor), readAt: null } }),
    );
  });
});
