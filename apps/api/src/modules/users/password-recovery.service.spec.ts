import {
  PasswordRecoveryService,
  PASSWORD_HELP_MESSAGE,
  resetTokenHash,
} from './password-recovery.service';
import type { AuthenticatedUser } from '@/common/interfaces';

jest.mock('./users.service', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('PasswordRecoveryService', () => {
  const actor = { id: 'admin', tenantId: 'tenant-1' } as AuthenticatedUser;
  function setup() {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([{ id: 'admin' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
      },
      refreshSession: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      notification: { upsert: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((task) =>
      typeof task === 'function' ? task(prisma) : Promise.all(task),
    );
    const audit = { log: jest.fn() };
    return { prisma, audit, service: new PasswordRecoveryService(prisma as never, audit as never) };
  }
  it('returns the same response for known and unknown accounts', async () => {
    const { prisma, service } = setup();
    const dto = { email: 'user@example.test', tenantSlug: 'test' };
    expect(await service.requestHelp(dto)).toEqual({ message: PASSWORD_HELP_MESSAGE });
    prisma.user.findFirst.mockResolvedValue({ id: 'user', tenantId: 'tenant-1', email: dto.email });
    expect(await service.requestHelp(dto)).toEqual({ message: PASSWORD_HELP_MESSAGE });
    expect(prisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          recipientUserId: 'admin',
          tenantId: 'tenant-1',
          template: 'password-reset-request',
        }),
      }),
    );
  });
  it('stores only a hash, invalidates older links and omits secrets from audit', async () => {
    const { prisma, audit, service } = setup();
    const result = await service.issue(actor, 'user', {});
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: actor.tenantId,
        tokenHash: resetTokenHash(result.token),
      }),
    });
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user', tenantId: actor.tenantId, usedAt: null },
      }),
    );
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain(result.token);
  });
  it('does not issue a link for a missing, inactive or cross-tenant user', async () => {
    const { prisma, service } = setup();
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.issue(actor, 'other-user', {})).rejects.toThrow('Aktif kullanıcı');
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) },
    { usedAt: null, expiresAt: new Date(0) },
  ])('rejects missing, used or expired links before writes (%j)', async (token) => {
    const { prisma, service } = setup();
    prisma.passwordResetToken.findUnique.mockResolvedValue(token);
    await expect(
      service.reset({ token: 'a'.repeat(64), password: 'Password123' }, {}),
    ).rejects.toThrow('Bağlantı geçersiz');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('claims the token once and revokes every session for that user', async () => {
    const { prisma, service } = setup();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token',
      userId: 'user',
      tenantId: 'tenant-1',
      userStamp: new Date(),
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await service.reset({ token: 'a'.repeat(64), password: 'Password123' }, {});
    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user', tenantId: 'tenant-1', revokedAt: null } }),
    );
  });
  it('rejects a link made stale by user changes without revoking sessions', async () => {
    const { prisma, service } = setup();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token',
      userId: 'user',
      tenantId: 'tenant-1',
      userStamp: new Date(),
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.reset({ token: 'a'.repeat(64), password: 'Password123' }, {}),
    ).rejects.toThrow('Bağlantı geçersiz');
    expect(prisma.refreshSession.updateMany).not.toHaveBeenCalled();
  });
});
