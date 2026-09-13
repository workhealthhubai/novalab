import { Injectable } from '@nestjs/common';
import type { RefreshSession } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export interface NewRefreshSession {
  id: string;
  tenantId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export class RefreshSessionAlreadyConsumedError extends Error {}

@Injectable()
export class RefreshSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: NewRefreshSession): Promise<RefreshSession> {
    return this.prisma.refreshSession.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent?.slice(0, 512) ?? null,
        ipAddress: data.ipAddress ?? null,
      },
    });
  }

  /** Atomically consumes one refresh token and creates its single successor. */
  rotate(
    consumed: { id: string; tokenHash: string },
    replacement: NewRefreshSession,
  ): Promise<RefreshSession> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshSession.updateMany({
        where: {
          id: consumed.id,
          userId: replacement.userId,
          tenantId: replacement.tenantId,
          tokenHash: consumed.tokenHash,
          revokedAt: null,
          replacedById: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date(), replacedById: replacement.id },
      });
      if (count !== 1) throw new RefreshSessionAlreadyConsumedError();
      return tx.refreshSession.create({
        data: {
          ...replacement,
          userAgent: replacement.userAgent?.slice(0, 512) ?? null,
          ipAddress: replacement.ipAddress ?? null,
        },
      });
    });
  }

  findById(id: string): Promise<RefreshSession | null> {
    return this.prisma.refreshSession.findUnique({ where: { id } });
  }

  async revoke(id: string, replacedById?: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: replacedById ?? null },
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const { count } = await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count;
  }

  /** Housekeeping helper for a scheduled job. */
  async deleteExpired(before = new Date()): Promise<number> {
    const { count } = await this.prisma.refreshSession.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return count;
  }
}
