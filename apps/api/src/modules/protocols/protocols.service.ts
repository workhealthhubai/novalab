import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  ProtocolItemStatus,
  type ProtocolItemType,
  ProtocolStatus,
} from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { CompaniesRepository } from '@/modules/companies/companies.repository';
import { EmployeesService } from '@/modules/employees/employees.service';
import type { CreateProtocolDto } from './dto/create-protocol.dto';
import type {
  AddProtocolItemsDto,
  CloseProtocolDto,
  UpdateProtocolItemDto,
} from './dto/protocol-item.dto';
import type { ProtocolQueryDto } from './dto/protocol-query.dto';
import type { UpdateProtocolDto } from './dto/update-protocol.dto';
import {
  canChangeItemStatus,
  deriveOpenStatus,
  isProtocolEditable,
  pendingItems,
} from './protocol-rules';
import { type ProtocolDetail, ProtocolsRepository } from './protocols.repository';

/** Audit snapshot without personal data. */
function snapshot(protocol: ProtocolDetail) {
  return {
    protocolNumber: protocol.protocolNumber,
    employeeId: protocol.employeeId,
    companyId: protocol.companyId,
    type: protocol.type,
    status: protocol.status,
    items: protocol.items.map((item) => `${item.type}:${item.status}`),
  };
}

@Injectable()
export class ProtocolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protocols: ProtocolsRepository,
    private readonly employees: EmployeesService,
    private readonly companies: CompaniesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: ProtocolQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.protocols.findMany(tenantId, skip, take, {
      search: query.search,
      status: query.status,
      employeeId: query.employeeId,
      companyId: query.companyId,
      from: query.from ? new Date(query.from) : undefined,
      // "to" is a calendar day: include the whole day.
      to: query.to ? new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`) : undefined,
    });
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string): Promise<ProtocolDetail> {
    const protocol = await this.protocols.findById(tenantId, id);
    if (!protocol) {
      throw new NotFoundException({
        message: 'Protocol not found',
        errorCode: 'PROTOCOL_NOT_FOUND',
      });
    }
    return protocol;
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateProtocolDto,
    ctx: RequestContext,
  ): Promise<ProtocolDetail> {
    const employee = await this.employees.get(tenantId, dto.employeeId);
    const companyId = dto.companyId ?? employee.companyId ?? null;
    if (companyId && !(await this.companies.exists(tenantId, companyId))) {
      throw new BadRequestException({
        message: 'Company not found',
        errorCode: 'COMPANY_NOT_FOUND',
      });
    }
    const protocol = await this.protocols.create(tenantId, {
      employeeId: employee.id,
      companyId,
      type: dto.type,
      notes: dto.notes ?? null,
      openedById: actor.id,
      items: dto.items,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Protocol',
      entityId: protocol.id,
      newValue: snapshot(protocol),
      ...ctx,
    });
    return protocol;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateProtocolDto,
    ctx: RequestContext,
  ): Promise<ProtocolDetail> {
    const before = await this.getEditable(tenantId, id);
    if (dto.companyId && !(await this.companies.exists(tenantId, dto.companyId))) {
      throw new BadRequestException({
        message: 'Company not found',
        errorCode: 'COMPANY_NOT_FOUND',
      });
    }
    await this.protocols.update(tenantId, id, {
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.companyId !== undefined ? { companyId: dto.companyId } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });
    const after = await this.get(tenantId, id);
    await this.logUpdate(tenantId, actor, before, after, ctx, Object.keys(dto));
    return after;
  }

  async addItems(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: AddProtocolItemsDto,
    ctx: RequestContext,
  ): Promise<ProtocolDetail> {
    const before = await this.getEditable(tenantId, id);
    const existing = new Set(before.items.map((item) => item.type));
    const duplicates = dto.items.filter((type) => existing.has(type));
    if (duplicates.length > 0) {
      throw new ConflictException({
        message: `Already on the protocol: ${duplicates.join(', ')}`,
        errorCode: 'PROTOCOL_ITEM_EXISTS',
      });
    }
    await this.protocols.addItems(tenantId, id, dto.items, before.items.length);
    const after = await this.get(tenantId, id);
    await this.logUpdate(tenantId, actor, before, after, ctx, ['items']);
    return after;
  }

  async updateItem(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    itemId: string,
    dto: UpdateProtocolItemDto,
    ctx: RequestContext,
  ): Promise<ProtocolDetail> {
    const before = await this.getEditable(tenantId, id);
    const item = before.items.find((candidate) => candidate.id === itemId);
    if (!item) {
      throw new NotFoundException({
        message: 'Protocol item not found',
        errorCode: 'PROTOCOL_ITEM_NOT_FOUND',
      });
    }
    if (dto.status && !canChangeItemStatus(item.status, dto.status)) {
      throw new ConflictException({
        message: `Cannot move item from ${item.status} to ${dto.status}`,
        errorCode: 'PROTOCOL_ITEM_TRANSITION',
      });
    }
    await this.protocols.updateItem(tenantId, itemId, {
      ...(dto.status !== undefined
        ? {
            status: dto.status,
            completedAt: dto.status === ProtocolItemStatus.DONE ? new Date() : null,
          }
        : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
    });
    const refreshed = await this.get(tenantId, id);
    const nextStatus = deriveOpenStatus(refreshed.status, refreshed.items);
    if (nextStatus !== refreshed.status)
      await this.protocols.update(tenantId, id, { status: nextStatus });
    const after = nextStatus !== refreshed.status ? await this.get(tenantId, id) : refreshed;
    await this.logUpdate(tenantId, actor, before, after, ctx, [`item:${item.type}`]);
    return after;
  }

  async close(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: CloseProtocolDto,
    ctx: RequestContext,
  ): Promise<ProtocolDetail> {
    const before = await this.getEditable(tenantId, id);
    const pending = pendingItems(before.items);
    if (pending.length > 0 && !dto.cancelPending) {
      throw new ConflictException({
        message: `Pending items: ${pending.map((item) => item.type).join(', ')}`,
        errorCode: 'PROTOCOL_HAS_PENDING_ITEMS',
      });
    }
    if (pending.length > 0) await this.protocols.cancelPendingItems(tenantId, id);
    await this.protocols.update(tenantId, id, {
      status: ProtocolStatus.COMPLETED,
      closedAt: new Date(),
      closedById: actor.id,
    });
    const after = await this.get(tenantId, id);
    await this.logUpdate(tenantId, actor, before, after, ctx, ['status:COMPLETED']);
    return after;
  }

  async cancel(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<ProtocolDetail> {
    const before = await this.getEditable(tenantId, id);
    await this.protocols.cancelPendingItems(tenantId, id);
    await this.protocols.update(tenantId, id, {
      status: ProtocolStatus.CANCELLED,
      closedAt: new Date(),
      closedById: actor.id,
    });
    const after = await this.get(tenantId, id);
    await this.logUpdate(tenantId, actor, before, after, ctx, ['status:CANCELLED']);
    return after;
  }

  /** Reopens a completed/cancelled protocol (audit-logged; items keep their states). */
  async reopen(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<ProtocolDetail> {
    const before = await this.get(tenantId, id);
    if (isProtocolEditable(before.status)) return before;
    await this.protocols.update(tenantId, id, {
      status: deriveOpenStatus(ProtocolStatus.OPEN, before.items),
      closedAt: null,
      closedById: null,
    });
    const after = await this.get(tenantId, id);
    await this.logUpdate(tenantId, actor, before, after, ctx, ['status:REOPENED']);
    return after;
  }

  openForEmployee(tenantId: string, employeeId: string) {
    return this.protocols.findOpenForEmployee(tenantId, employeeId);
  }

  /**
   * Records the doctor module created for this protocol, per item type — lets the protocol page
   * link straight to the test/report instead of only showing "done".
   */
  async records(tenantId: string, id: string) {
    const protocol = await this.get(tenantId, id);
    const scope = { tenantId, protocolId: id, deletedAt: null } as const;
    const employeeRef = { select: { id: true, firstName: true, lastName: true } };
    void employeeRef;
    const [audiometry, spirometry, eye, ecg, pneumoconiosis, examinations] = await Promise.all([
      this.prisma.audiometryTest.findMany({
        where: scope,
        select: { id: true, performedAt: true, ptaRight: true, ptaLeft: true, isBaseline: true },
        orderBy: { performedAt: 'desc' },
      }),
      this.prisma.spirometryTest.findMany({
        where: scope,
        select: { id: true, performedAt: true, pattern: true, fev1: true, fvc: true },
        orderBy: { performedAt: 'desc' },
      }),
      this.prisma.eyeExamination.findMany({
        where: scope,
        select: { id: true, performedAt: true, recommendation: true },
        orderBy: { performedAt: 'desc' },
      }),
      this.prisma.ecgRecord.findMany({
        where: scope,
        select: { id: true, performedAt: true, interpretation: true, heartRate: true },
        orderBy: { performedAt: 'desc' },
      }),
      this.prisma.pneumoconiosisReading.findMany({
        where: scope,
        select: { id: true, readAt: true, result: true, profusion: true, radiologyRequestId: true },
        orderBy: { readAt: 'desc' },
      }),
      this.prisma.examination.findMany({
        where: scope,
        select: {
          id: true,
          status: true,
          fitnessDecision: true,
          performedAt: true,
          approvedAt: true,
          reportDocumentId: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    // Radiology requests carry no protocol id: those linked to the report's examination, plus the
    // patient's requests opened while the protocol was open.
    const windowEnd = protocol.closedAt ?? new Date();
    const radiology = await this.prisma.radiologyRequest.findMany({
      where: {
        tenantId,
        employeeId: protocol.employeeId,
        deletedAt: null,
        OR: [
          ...(examinations.length > 0
            ? [{ examinationId: { in: examinations.map((e) => e.id) } }]
            : []),
          { requestedAt: { gte: protocol.openedAt, lte: windowEnd } },
        ],
      },
      select: {
        id: true,
        modality: true,
        bodyPart: true,
        status: true,
        requestedAt: true,
        studyInstanceUid: true,
        reportedAt: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
    return {
      audiometry: audiometry.map((t) => ({
        ...t,
        ptaRight: t.ptaRight === null ? null : Number(t.ptaRight),
        ptaLeft: t.ptaLeft === null ? null : Number(t.ptaLeft),
      })),
      spirometry: spirometry.map((t) => ({
        ...t,
        fev1: t.fev1 === null ? null : Number(t.fev1),
        fvc: t.fvc === null ? null : Number(t.fvc),
      })),
      eye,
      ecg,
      pneumoconiosis,
      radiology,
      healthReport: examinations[0] ?? null,
    };
  }

  /** Open protocols whose item of the given type is still pending — the doctor module worklist. */
  async worklist(tenantId: string, itemType: ProtocolItemType, limit: number) {
    const rows = await this.prisma.protocol.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        items: { some: { type: itemType, status: 'PENDING' } },
      },
      select: {
        id: true,
        protocolNumber: true,
        type: true,
        openedAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            birthDate: true,
            gender: true,
          },
        },
        company: { select: { id: true, name: true } },
        items: { select: { type: true, status: true } },
      },
      orderBy: { openedAt: 'asc' },
      take: limit,
    });
    return rows.map((r) => ({
      ...r,
      pendingCount: r.items.filter((i) => i.status === 'PENDING').length,
      items: undefined,
    }));
  }

  private async getEditable(tenantId: string, id: string): Promise<ProtocolDetail> {
    const protocol = await this.get(tenantId, id);
    if (!isProtocolEditable(protocol.status)) {
      throw new ConflictException({
        message: `Protocol is ${protocol.status}`,
        errorCode: 'PROTOCOL_NOT_EDITABLE',
      });
    }
    return protocol;
  }

  private logUpdate(
    tenantId: string,
    actor: AuthenticatedUser,
    before: ProtocolDetail,
    after: ProtocolDetail,
    ctx: RequestContext,
    changedFields: string[],
  ) {
    return this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Protocol',
      entityId: after.id,
      oldValue: snapshot(before),
      newValue: { ...snapshot(after), changedFields },
      ...ctx,
    });
  }
}
