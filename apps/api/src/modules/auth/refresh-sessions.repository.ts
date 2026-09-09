import { Injectable } from '@nestjs/common';
import type { RefreshSession } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class RefreshSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    id: string;
    tenantId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | undefined;
    ipAddress?: string | undefined;
  }): Promise<RefreshSession> {
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
