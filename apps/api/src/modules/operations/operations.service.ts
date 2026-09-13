import { companyScope } from '@/common/policies/company-scope';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  OPERATION_DEFINITIONS,
  PERMISSIONS,
  type OperationKind,
  type OperationOption,
} from '@osgb/shared-types';
import type { AuthenticatedUser } from '@/common/interfaces';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import type { Prisma } from '@/generated/prisma/client';
import type { OperationQueryDto, SaveOperationDto } from './operations.dto';
import { isLocked, isOperationKind, validateOperation } from './operation-validation';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async authorize(actor: AuthenticatedUser, value: string, write = false): Promise<OperationKind> {
    if (!isOperationKind(value)) throw new NotFoundException('Modül bulunamadı.');
    const definition = OPERATION_DEFINITIONS[value];
    if (!actor.permissions.includes(write ? definition.write : definition.read))
      throw new ForbiddenException('Bu işlem için yetkiniz yok.');
    if (value === 'lab' || value === 'isg')
      await this.audit.log({
        tenantId: actor.tenantId,
        userId: actor.id,
        action: AuditAction.MEDICAL_DATA_ACCESS,
        entityType: `Operation:${value}`,
      });
    return value;
  }
  private where(
    tenantId: string,
    kind: OperationKind,
    q: OperationQueryDto,
  ): Prisma.OperationRecordWhereInput {
    for (const date of [q.from, q.to])
      if (
        date &&
        (!Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
      )
        throw new BadRequestException('Geçersiz tarih.');
    if (q.from && q.to && q.from > q.to)
      throw new BadRequestException('Başlangıç tarihi bitişten sonra olamaz.');
    return {
      tenantId,
      kind,
      deletedAt: null,
      ...(q.protocolId ? { protocolId: q.protocolId } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.from || q.to
        ? {
            date: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
    };
  }
  async list(actor: AuthenticatedUser, value: string, q: OperationQueryDto) {
    const kind = await this.authorize(actor, value);
    const where = this.where(actor.tenantId, kind, q);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.operationRecord.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.operationRecord.count({ where }),
    ]);
    const payloads = items.map((item) => item.fields as Record<string, string>);
    const [companies, physicians, protocols] = await Promise.all([
      this.prisma.company.findMany({
        where: {
          tenantId: actor.tenantId,
          id: { in: payloads.map((f) => f.companyId).filter((id): id is string => Boolean(id)) },
        },
        select: { id: true, name: true },
      }),
      this.prisma.physician.findMany({
        where: {
          tenantId: actor.tenantId,
          id: { in: payloads.map((f) => f.physicianId).filter((id): id is string => Boolean(id)) },
        },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.protocol.findMany({
        where: {
          tenantId: actor.tenantId,
          id: { in: payloads.map((f) => f.protocolId).filter((id): id is string => Boolean(id)) },
        },
        select: { id: true, protocolNumber: true },
      }),
    ]);
    const labels = new Map([
      ...companies.map((r) => [r.id, r.name] as const),
      ...physicians.map((r) => [r.id, `${r.firstName} ${r.lastName}`] as const),
      ...protocols.map((r) => [r.id, r.protocolNumber] as const),
    ]);
    const enriched = items.map((item) => ({
      ...item,
      references: Object.fromEntries(
        Object.entries(item.fields as Record<string, string>)
          .filter(([key]) => ['companyId', 'physicianId', 'protocolId'].includes(key))
          .map(([key, id]) => [key, labels.get(id) ?? id]),
      ),
    }));
    return {
      items: enriched,
      meta: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
    };
  }
  async summary(actor: AuthenticatedUser, value: string, q: OperationQueryDto) {
    const kind = await this.authorize(actor, value);
    const where = this.where(actor.tenantId, kind, q);
    const states = await this.prisma.operationRecord.groupBy({
      by: ['status'],
      where,
      _count: true,
      _sum: { amountCents: true },
    });
    const income =
      kind === 'accounting'
        ? await this.prisma.operationRecord.aggregate({
            where: { ...where, status: 'Ödendi', fields: { path: ['direction'], equals: 'Gelir' } },
            _sum: { amountCents: true },
          })
        : null;
    const expense =
      kind === 'accounting'
        ? await this.prisma.operationRecord.aggregate({
            where: { ...where, status: 'Ödendi', fields: { path: ['direction'], equals: 'Gider' } },
            _sum: { amountCents: true },
          })
        : null;
    return {
      states: states.map((s) => ({
        status: s.status,
        count: s._count,
        amountCents: s._sum.amountCents ?? 0,
      })),
      balanceCents:
        kind === 'accounting'
          ? (income?._sum.amountCents ?? 0) - (expense?._sum.amountCents ?? 0)
          : null,
    };
  }
  async options(
    actor: AuthenticatedUser,
    value: string,
    field: string,
    search = '',
  ): Promise<OperationOption[]> {
    const kind = await this.authorize(actor, value);
    const type = OPERATION_DEFINITIONS[kind].fields.find((f) => f.key === field)?.type;
    const tenantId = actor.tenantId;
    if (type === 'company')
      return (
        await this.prisma.company.findMany({
          where: { tenantId, deletedAt: null, name: { contains: search, mode: 'insensitive' } },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
          take: 50,
        })
      ).map((r) => ({ id: r.id, label: r.name }));
    if (type === 'physician')
      return (
        await this.prisma.physician.findMany({
          where: {
            tenantId,
            deletedAt: null,
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
          select: { id: true, firstName: true, lastName: true },
          take: 50,
        })
      ).map((r) => ({ id: r.id, label: `${r.firstName} ${r.lastName}` }));
    if (type === 'protocol')
      return (
        await this.prisma.protocol.findMany({
          where: {
            tenantId,
            deletedAt: null,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            protocolNumber: { contains: search, mode: 'insensitive' },
            items: { some: { type: kind === 'lab' ? 'LAB' : 'ISG_REPORT', status: 'PENDING' } },
          },
          select: { id: true, protocolNumber: true },
          orderBy: { openedAt: 'desc' },
          take: 50,
        })
      ).map((r) => ({ id: r.id, label: r.protocolNumber }));
    throw new BadRequestException('Geçersiz seçim alanı.');
  }
  async save(actor: AuthenticatedUser, value: string, dto: SaveOperationDto, id?: string) {
    const kind = await this.authorize(actor, value, true);
    let data: ReturnType<typeof validateOperation>;
    try {
      data = validateOperation(kind, dto);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Geçersiz kayıt.');
    }
    const tenantId = actor.tenantId;
    return this.prisma.$transaction(async (tx) => {
      const before = id
        ? await tx.operationRecord.findFirst({ where: { id, tenantId, kind, deletedAt: null } })
        : null;
      if (id && !before) throw new NotFoundException('Kayıt bulunamadı.');
      if (before && (dto.version !== before.version || isLocked(kind, before.status)))
        throw new ConflictException('Kayıt değişmiş veya kesinleşmiş. Listeyi yenileyin.');
      if (
        data.fields.companyId &&
        !(await tx.company.findFirst({
          where: { id: data.fields.companyId, tenantId, deletedAt: null },
          select: { id: true },
        }))
      )
        throw new BadRequestException('Firma bulunamadı.');
      if (
        data.fields.physicianId &&
        !(await tx.physician.findFirst({
          where: { id: data.fields.physicianId, tenantId, deletedAt: null },
          select: { id: true },
        }))
      )
        throw new BadRequestException('Hekim bulunamadı.');
      if (before?.protocolId && data.protocolId !== before.protocolId)
        throw new BadRequestException('Kayıt protokolü değiştirilemez.');
      if (data.protocolId) {
        const locked = await tx.protocol.updateMany({
          where: {
            id: data.protocolId,
            tenantId,
            deletedAt: null,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            ...(data.fields.companyId ? { companyId: data.fields.companyId } : {}),
          },
          data: {
            updatedAt: new Date(),
            ...(data.status === 'Tamamlandı' ? { status: 'IN_PROGRESS' as const } : {}),
          },
        });
        if (!locked.count)
          throw new ConflictException('Protokol kapalı, farklı firmaya ait veya bulunamadı.');
        const item = await tx.protocolItem.findFirst({
          where: {
            protocolId: data.protocolId,
            tenantId,
            type: kind === 'lab' ? 'LAB' : 'ISG_REPORT',
            status: 'PENDING',
          },
        });
        if (!item) throw new ConflictException('Protokolde bekleyen ilgili tetkik bulunamadı.');
        const duplicate = await tx.operationRecord.findFirst({
          where: {
            tenantId,
            kind,
            protocolId: data.protocolId,
            ...(id ? { id: { not: id } } : {}),
          },
          select: { id: true },
        });
        if (duplicate)
          throw new ConflictException('Bu protokol için kayıt zaten var; mevcut kaydı düzenleyin.');
        if (data.status === 'Tamamlandı')
          await tx.protocolItem.update({
            where: { id: item.id },
            data: { status: 'DONE', completedAt: new Date() },
          });
      }
      if (id) {
        const result = await tx.operationRecord.updateMany({
          where: { id, tenantId, kind, version: dto.version, deletedAt: null },
          data: { ...data, version: { increment: 1 } },
        });
        if (!result.count)
          throw new ConflictException('Kayıt başka bir kullanıcı tarafından değiştirildi.');
        return tx.operationRecord.findFirstOrThrow({ where: { id, tenantId } });
      }
      return tx.operationRecord.create({
        data: { ...data, kind, tenantId, createdById: actor.id },
      });
    });
  }
  async dashboard(actor: AuthenticatedUser) {
    const tenantId = actor.tenantId;
    const scopedId = companyScope(actor);
    const can = (p: (typeof actor.permissions)[number]) =>
      actor.permissions.includes(p) &&
      (!scopedId || p === PERMISSIONS.EMPLOYEES_READ || p === PERMISSIONS.COMPANIES_READ);
    const [patients, companies, protocols, reports] = await Promise.all([
      can(PERMISSIONS.EMPLOYEES_READ)
        ? this.prisma.employee.count({
            where: { tenantId, deletedAt: null, ...(scopedId ? { companyId: scopedId } : {}) },
          })
        : null,
      can(PERMISSIONS.COMPANIES_READ)
        ? this.prisma.company.count({
            where: { tenantId, deletedAt: null, ...(scopedId ? { id: scopedId } : {}) },
          })
        : null,
      can(PERMISSIONS.PROTOCOLS_READ)
        ? this.prisma.protocol.count({
            where: { tenantId, deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          })
        : null,
      can(PERMISSIONS.EXAMINATIONS_READ)
        ? this.prisma.examination.count({
            where: { tenantId, deletedAt: null, status: 'COMPLETED' },
          })
        : null,
    ]);
    return { patients, companies, protocols, reports };
  }

  async remove(actor: AuthenticatedUser, rawKind: string, id: string) {
    const kind = await this.authorize(actor, rawKind, true);
    const tenantId = actor.tenantId;
    const record = await this.prisma.operationRecord.findFirst({
      where: { id, tenantId, kind, deletedAt: null },
    });
    if (!record) throw new NotFoundException('Kayıt bulunamadı.');
    if (isLocked(kind, record.status)) {
      throw new ConflictException('Kesinleşmiş veya kilitli kayıt silinemez.');
    }
    await this.prisma.operationRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: `Operation:${kind}`,
      entityId: id,
      oldValue: { title: record.title, status: record.status },
    });
    return { success: true };
  }
}

