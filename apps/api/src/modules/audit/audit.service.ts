import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { PaginatedResult } from '@osgb/shared-types';
import { AuditAction } from '@osgb/shared-types';
import {
  BUSINESS_ACTIONS,
  CATEGORY_ENTITY_TYPES,
  categoryOf,
  isTechnical,
  SESSION_ACTIONS,
  type ActivityCategory,
} from './audit-activity';
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
  from?: string;
  to?: string;
  outcome?: 'SUCCESS' | 'FAILURE';
}

/** Fields that must never be persisted in audit payloads. */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'tokenhash',
  'authorization',
  'nationalid',
  'passportnumber',
  'firstname',
  'lastname',
  'birthdate',
  'anamnesis',
  'systemsexam',
  'findings',
  'conclusion',
  'reporttext',
  'signature',
  'signaturekey',
  'clinicalinfo',
  'notes',
  'email',
  'phone',
  'address',
  'addressline',
  'objectkey',
  'filename',
  'search',
  'query',
]);

export function toAuditJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  const sanitized = JSON.parse(
    JSON.stringify(value, (key, val: unknown) => {
      const normalizedKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(normalizedKey)) return '[REDACTED]';
      if (normalizedKey === 'path' && typeof val === 'string') return val.split(/[?#]/, 1)[0];
      return val;
    }),
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
          oldValue: toAuditJson(entry.oldValue),
          newValue: toAuditJson(entry.newValue),
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent?.slice(0, 512) ?? null,
          requestId: entry.requestId ?? null,
          metadata: toAuditJson(entry.metadata),
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

  /* ------------------------------------------------ Personel Hareketleri */

  /**
   * Business-level activity with entity labels resolved (patient names, protocol numbers, file
   * names…) so the screen can say "X hastasını kaydetti" instead of showing raw ids.
   */
  async activity(
    tenantId: string,
    query: AuditQuery & { category?: ActivityCategory; technical?: boolean },
  ) {
    const base = this.whereOf(tenantId, query);
    const categoryWhere = this.categoryWhere(query.category);
    const where: Prisma.AuditLogWhereInput = {
      AND: [
        base,
        ...(query.technical ? [] : [{ action: { in: [...BUSINESS_ACTIONS] } }]),
        ...(categoryWhere ? [categoryWhere] : []),
      ],
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query.page, query.pageSize),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const labels = await this.resolveLabels(tenantId, rows);
    const items = rows.map((row) => {
      const resolved = labels.get(`${row.entityType}:${row.entityId ?? ''}`);
      return {
        ...row,
        category: categoryOf(row),
        technical: isTechnical(row),
        entityLabel: resolved?.label ?? null,
        patientId: resolved?.patientId ?? null,
      };
    });
    return paginate(items, query.page, query.pageSize, total);
  }

  /** Per-user counts by category for the period, plus the last login. */
  async activitySummary(tenantId: string, range: { from?: string; to?: string }) {
    const where = this.whereOf(tenantId, {
      page: 1,
      pageSize: 1,
      from: range.from,
      to: range.to,
    });
    const rows = await this.prisma.auditLog.findMany({
      where: { ...where, action: { in: [...BUSINESS_ACTIONS] } },
      select: { userId: true, action: true, entityType: true, metadata: true, createdAt: true },
    });
    const users = new Map<
      string,
      {
        counts: Record<ActivityCategory, number>;
        total: number;
        lastActivityAt: Date;
        lastLoginAt: Date | null;
      }
    >();
    for (const row of rows) {
      const key = row.userId ?? 'anonymous';
      const entry = users.get(key) ?? {
        counts: {
          SESSION: 0,
          PATIENT: 0,
          PROTOCOL: 0,
          TEST: 0,
          REPORT: 0,
          DOCUMENT: 0,
          DEFINITION: 0,
          ACCESS: 0,
          FAILURE: 0,
          OTHER: 0,
        },
        total: 0,
        lastActivityAt: row.createdAt,
        lastLoginAt: null,
      };
      const category = categoryOf(row);
      entry.counts[category] += 1;
      entry.total += 1;
      if (row.createdAt > entry.lastActivityAt) entry.lastActivityAt = row.createdAt;
      if (
        row.action === AuditAction.LOGIN &&
        (!entry.lastLoginAt || row.createdAt > entry.lastLoginAt)
      )
        entry.lastLoginAt = row.createdAt;
      users.set(key, entry);
    }
    const ids = [...users.keys()].filter((k) => k !== 'anonymous');
    const people = await this.prisma.user.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, firstName: true, lastName: true, email: true, status: true },
    });
    return [...users.entries()]
      .map(([userId, entry]) => ({
        user: people.find((p) => p.id === userId) ?? null,
        userId: userId === 'anonymous' ? null : userId,
        ...entry,
      }))
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }

  private categoryWhere(category: ActivityCategory | undefined): Prisma.AuditLogWhereInput | null {
    if (!category) return null;
    switch (category) {
      case 'SESSION':
        return {
          OR: [
            { action: { in: [...SESSION_ACTIONS] } },
            { entityType: { in: ['Session', 'Auth', 'RefreshSession'] } },
          ],
        };
      case 'ACCESS':
        return { action: AuditAction.MEDICAL_DATA_ACCESS };
      case 'FAILURE':
        return {
          OR: [
            { metadata: { path: ['outcome'], equals: 'FAILURE' } },
            { action: { in: [AuditAction.LOGIN_FAILED, AuditAction.TOKEN_REUSE_DETECTED] } },
          ],
        };
      case 'OTHER':
        return {
          entityType: {
            notIn: Object.values(CATEGORY_ENTITY_TYPES)
              .flat()
              .concat(['Session', 'Auth', 'RefreshSession']),
          },
        };
      default:
        return {
          entityType: { in: [...CATEGORY_ENTITY_TYPES[category]] },
          action: { not: AuditAction.MEDICAL_DATA_ACCESS },
        };
    }
  }

  private whereOf(tenantId: string, query: AuditQuery): Prisma.AuditLogWhereInput {
    return {
      tenantId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to
                ? {
                    lte:
                      query.to.length === 10
                        ? new Date(`${query.to}T23:59:59.999Z`)
                        : new Date(query.to),
                  }
                : {}),
            },
          }
        : {}),
      ...(query.outcome ? { metadata: { path: ['outcome'], equals: query.outcome } } : {}),
    };
  }

  /** Batch lookup of display labels per entity type; unknown types/ids stay unlabelled. */
  private async resolveLabels(
    tenantId: string,
    rows: Array<{ entityType: string; entityId: string | null }>,
  ) {
    const out = new Map<string, { label: string; patientId: string | null }>();
    const byType = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!row.entityId || !/^[0-9a-f-]{36}$/.test(row.entityId)) continue;
      const set = byType.get(row.entityType) ?? new Set<string>();
      set.add(row.entityId);
      byType.set(row.entityType, set);
    }
    const put = (type: string, id: string, label: string, patientId: string | null = null) =>
      out.set(`${type}:${id}`, { label, patientId });
    const name = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`;
    const ids = (type: string) => [...(byType.get(type) ?? [])];
    const withEmployee = {
      select: {
        id: true,
        employeeId: true,
        employee: { select: { firstName: true, lastName: true } },
      },
    } as const;
    const tasks: Array<Promise<void>> = [];
    if (ids('Employee').length)
      tasks.push(
        this.prisma.employee
          .findMany({
            where: { tenantId, id: { in: ids('Employee') } },
            select: { id: true, firstName: true, lastName: true },
          })
          .then((r) => r.forEach((e) => put('Employee', e.id, name(e), e.id))),
      );
    if (ids('Protocol').length)
      tasks.push(
        this.prisma.protocol
          .findMany({
            where: { tenantId, id: { in: ids('Protocol') } },
            select: {
              id: true,
              protocolNumber: true,
              employeeId: true,
              employee: { select: { firstName: true, lastName: true } },
            },
          })
          .then((r) =>
            r.forEach((p) =>
              put('Protocol', p.id, `${p.protocolNumber} · ${name(p.employee)}`, p.employeeId),
            ),
          ),
      );
    if (ids('Examination').length)
      tasks.push(
        this.prisma.examination
          .findMany({ where: { tenantId, id: { in: ids('Examination') } }, ...withEmployee })
          .then((r) => r.forEach((e) => put('Examination', e.id, name(e.employee), e.employeeId))),
      );
    for (const [type, model] of [
      ['AudiometryTest', this.prisma.audiometryTest],
      ['SpirometryTest', this.prisma.spirometryTest],
      ['EyeExamination', this.prisma.eyeExamination],
      ['EcgRecord', this.prisma.ecgRecord],
      ['PneumoconiosisReading', this.prisma.pneumoconiosisReading],
      ['RadiologyRequest', this.prisma.radiologyRequest],
      ['PatientConsent', this.prisma.patientConsent],
      ['DocumentSignature', this.prisma.documentSignature],
    ] as const) {
      if (ids(type).length)
        tasks.push(
          (
            model as unknown as {
              findMany: (args: unknown) => Promise<
                Array<{
                  id: string;
                  employeeId: string;
                  employee: { firstName: string; lastName: string };
                }>
              >;
            }
          )
            .findMany({ where: { tenantId, id: { in: ids(type) } }, ...withEmployee })
            .then((r) => r.forEach((e) => put(type, e.id, name(e.employee), e.employeeId))),
        );
    }
    if (ids('Document').length)
      tasks.push(
        this.prisma.document
          .findMany({
            where: { tenantId, id: { in: ids('Document') } },
            select: { id: true, fileName: true, employeeId: true },
          })
          .then((r) => r.forEach((d) => put('Document', d.id, d.fileName, d.employeeId))),
      );
    if (ids('Company').length)
      tasks.push(
        this.prisma.company
          .findMany({
            where: { tenantId, id: { in: ids('Company') } },
            select: { id: true, name: true },
          })
          .then((r) => r.forEach((c) => put('Company', c.id, c.name))),
      );
    if (ids('Physician').length)
      tasks.push(
        this.prisma.physician
          .findMany({
            where: { tenantId, id: { in: ids('Physician') } },
            select: { id: true, firstName: true, lastName: true },
          })
          .then((r) => r.forEach((p) => put('Physician', p.id, name(p)))),
      );
    if (ids('User').length)
      tasks.push(
        this.prisma.user
          .findMany({
            where: { tenantId, id: { in: ids('User') } },
            select: { id: true, firstName: true, lastName: true },
          })
          .then((r) => r.forEach((u) => put('User', u.id, name(u)))),
      );
    if (ids('Role').length)
      tasks.push(
        this.prisma.role
          .findMany({
            where: { tenantId, id: { in: ids('Role') } },
            select: { id: true, name: true },
          })
          .then((r) => r.forEach((x) => put('Role', x.id, x.name))),
      );
    if (ids('TestDefinition').length)
      tasks.push(
        this.prisma.testDefinition
          .findMany({
            where: { tenantId, id: { in: ids('TestDefinition') } },
            select: { id: true, name: true },
          })
          .then((r) => r.forEach((x) => put('TestDefinition', x.id, x.name))),
      );
    if (ids('TestPackage').length)
      tasks.push(
        this.prisma.testPackage
          .findMany({
            where: { tenantId, id: { in: ids('TestPackage') } },
            select: { id: true, name: true },
          })
          .then((r) => r.forEach((x) => put('TestPackage', x.id, x.name))),
      );
    if (ids('Occupation').length)
      tasks.push(
        this.prisma.occupation
          .findMany({
            where: { tenantId, id: { in: ids('Occupation') } },
            select: { id: true, name: true },
          })
          .then((r) => r.forEach((x) => put('Occupation', x.id, x.name))),
      );
    if (ids('ConsentTemplate').length)
      tasks.push(
        this.prisma.consentTemplate
          .findMany({
            where: { tenantId, id: { in: ids('ConsentTemplate') } },
            select: { id: true, title: true, version: true },
          })
          .then((r) => r.forEach((x) => put('ConsentTemplate', x.id, `${x.title} v${x.version}`))),
      );
    await Promise.all(tasks);
    return out;
  }

  async findMany(tenantId: string, query: AuditQuery): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              // A bare date means the whole day.
              ...(query.to
                ? {
                    lte:
                      query.to.length === 10
                        ? new Date(`${query.to}T23:59:59.999Z`)
                        : new Date(query.to),
                  }
                : {}),
            },
          }
        : {}),
      ...(query.outcome ? { metadata: { path: ['outcome'], equals: query.outcome } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query.page, query.pageSize),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(items, query.page, query.pageSize, total);
  }
}
