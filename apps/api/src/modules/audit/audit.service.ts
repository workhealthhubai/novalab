import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { PaginatedResult } from '@osgb/shared-types';
import { AuditAction } from '@osgb/shared-types';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { Prisma, type AuditLog } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export interface AuditEntry {
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  requestId?: string | undefined;
  /** Request/outcome details (method, path, statusCode, durationMs, outcome, errorCode). */
  metadata?: Record<string, unknown> | undefined;
}

/** Actions that describe *access*, not a business change; they never suppress the automatic HTTP audit. */
const ACCESS_ACTIONS = new Set<string>([AuditAction.MEDICAL_DATA_ACCESS]);
const RECENT_TTL_MS = 60_000;

export interface AuditQuery {
  page: number;
  pageSize: number;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  requestId?: string;
}

/** Fields that must never be persisted in audit payloads. */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'tokenHash',
]);

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  const sanitized = JSON.parse(
    JSON.stringify(value, (key, val: unknown) => (SENSITIVE_KEYS.has(key) ? '[REDACTED]' : val)),
  ) as Prisma.InputJsonValue;
  return sanitized;
}

/**
 * Writes immutable audit records. Failures are logged but never break the
 * business operation that triggered them.
 */
@Injectable()
export class AuditService {
  /** requestId -> (business actions logged, timestamp). Lets AuditInterceptor avoid duplicate rows. */
  private readonly recent = new Map<string, { actions: Set<string>; at: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuditService.name);
  }

  /** True when a service already wrote a business (non-access) entry for this request. */
  hasBusinessEntry(requestId: string | undefined): boolean {
    if (!requestId) return false;
    const seen = this.recent.get(requestId);
    return Boolean(seen && [...seen.actions].some((action) => !ACCESS_ACTIONS.has(action)));
  }

  private remember(entry: AuditEntry): void {
    if (!entry.requestId) return;
    const now = Date.now();
    const seen = this.recent.get(entry.requestId) ?? { actions: new Set<string>(), at: now };
    seen.actions.add(entry.action);
    seen.at = now;
    this.recent.set(entry.requestId, seen);
    if (this.recent.size > 1000) {
      for (const [id, value] of this.recent)
        if (now - value.at > RECENT_TTL_MS) this.recent.delete(id);
    }
  }

  async log(entry: AuditEntry): Promise<void> {
    this.remember(entry);
    this.logger.info(
      {
        audit: true,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        tenantId: entry.tenantId,
        userId: entry.userId,
        requestId: entry.requestId,
      },
      'audit',
    );
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          oldValue: toJson(entry.oldValue),
          newValue: toJson(entry.newValue),
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent?.slice(0, 512) ?? null,
          requestId: entry.requestId ?? null,
          metadata: toJson(entry.metadata),
        },
      });
    } catch (error) {
      this.logger.error(
        {
          err: error,
          action: entry.action,
          entityType: entry.entityType,
          tenantId: entry.tenantId,
        },
        'Failed to write audit log',
      );
    }
  }

  async findMany(tenantId: string, query: AuditQuery): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query.page, query.pageSize),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(items, query.page, query.pageSize, total);
  }
}
