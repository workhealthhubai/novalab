import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';

const sessionInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      lastLoginAt: true,
    },
  },
} satisfies Prisma.RefreshSessionInclude;

/**
 * Aktif Kullanıcılar: live refresh sessions (not revoked, not expired). Refresh rotation replaces
 * the row on every token refresh, so `createdAt` is the last refresh, i.e. the last activity.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listActive(tenantId: string, actor: AuthenticatedUser) {
    const rows = await this.prisma.refreshSession.findMany({
      where: { tenantId, revokedAt: null, expiresAt: { gt: new Date() } },
      include: sessionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(({ tokenHash: _hash, ...session }) => ({
      ...session,
      current: session.id === actor.sessionId,
    }));
  }

  /** Revokes one session; the user is signed out on their next token refresh. */
  async revoke(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    const session = await this.prisma.refreshSession.findFirst({
      where: { id, tenantId },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (!session)
      throw new NotFoundException({ message: 'Session not found', errorCode: 'SESSION_NOT_FOUND' });
    if (session.revokedAt) return;
    await this.prisma.refreshSession.update({ where: { id }, data: { revokedAt: new Date() } });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.LOGOUT,
      entityType: 'Session',
      entityId: id,
      newValue: {
        revokedByAdmin: true,
        targetUserId: session.userId,
        self: session.id === actor.sessionId,
      },
      ...ctx,
    });
  }

  /** Revokes every live session of a user (e.g. lost device); returns how many were closed. */
  async revokeAllForUser(
    tenantId: string,
    actor: AuthenticatedUser,
    userId: string,
    ctx: RequestContext,
  ): Promise<{ revoked: number }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!user)
      throw new NotFoundException({ message: 'User not found', errorCode: 'USER_NOT_FOUND' });
    const { count } = await this.prisma.refreshSession.updateMany({
      where: { tenantId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.LOGOUT,
      entityType: 'Session',
      entityId: null,
      newValue: { revokedByAdmin: true, targetUserId: userId, revoked: count },
      ...ctx,
    });
    return { revoked: count };
  }
}
