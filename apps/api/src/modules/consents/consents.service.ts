import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, type ConsentType } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { DEFAULT_CONSENT_TEXTS } from './consent-defaults';
import type {
  ConsentQueryDto,
  GiveConsentDto,
  PublishTemplateDto,
  TemplateQueryDto,
  WithdrawConsentDto,
} from './dto/consent.dtos';

const consentInclude = {
  template: { select: { id: true, type: true, version: true, title: true } },
  employee: { select: { id: true, firstName: true, lastName: true, nationalId: true } },
  collectedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PatientConsentInclude;

export type PatientConsentView = Prisma.PatientConsentGetPayload<{
  include: typeof consentInclude;
}>;

@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /* ------------------------------------------------------------ templates */

  listTemplates(tenantId: string, query: TemplateQueryDto) {
    return this.prisma.consentTemplate.findMany({
      where: {
        tenantId,
        ...(query.type ? { type: query.type } : {}),
        ...(query.activeOnly ? { isActive: true } : {}),
      },
      include: { _count: { select: { consents: true } } },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });
  }

  /** Publishes version n+1 for the type and retires the previous active version. */
  async publishTemplate(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: PublishTemplateDto,
    ctx: RequestContext,
  ) {
    const template = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.consentTemplate.findFirst({
        where: { tenantId, type: dto.type },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      await tx.consentTemplate.updateMany({
        where: { tenantId, type: dto.type, isActive: true },
        data: { isActive: false },
      });
      return tx.consentTemplate.create({
        data: {
          tenantId,
          type: dto.type,
          version: (latest?.version ?? 0) + 1,
          title: dto.title.trim(),
          body: dto.body.trim(),
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
          createdById: actor.id,
        },
        include: { _count: { select: { consents: true } } },
      });
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'ConsentTemplate',
      entityId: template.id,
      newValue: { type: template.type, version: template.version, title: template.title },
      ...ctx,
    });
    return template;
  }

  /** Loads the bundled starter texts for types that have no version yet. */
  async importDefaults(
    tenantId: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ imported: ConsentType[]; skipped: ConsentType[] }> {
    const existing = new Set(
      (
        await this.prisma.consentTemplate.findMany({
          where: { tenantId },
          select: { type: true },
          distinct: ['type'],
        })
      ).map((t) => t.type),
    );
    const imported: ConsentType[] = [];
    for (const text of DEFAULT_CONSENT_TEXTS) {
      if (existing.has(text.type)) continue;
      await this.publishTemplate(
        tenantId,
        actor,
        { type: text.type, title: text.title, body: text.body },
        ctx,
      );
      imported.push(text.type);
    }
    return {
      imported,
      skipped: DEFAULT_CONSENT_TEXTS.map((t) => t.type).filter((t) => existing.has(t)),
    };
  }

  /* ------------------------------------------------------------- consents */

  async listConsents(tenantId: string, query: ConsentQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const search = query.search?.trim();
    const where: Prisma.PatientConsentWhereInput = {
      tenantId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { template: { type: query.type } } : {}),
      ...(search
        ? {
            employee: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { nationalId: { startsWith: search } },
              ],
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.patientConsent.findMany({
        where,
        include: consentInclude,
        orderBy: { givenAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.patientConsent.count({ where }),
    ]);
    return paginate(items, query.page, query.pageSize, total);
  }

  /** Current state per consent type for one patient (latest record per type). */
  async patientSummary(tenantId: string, employeeId: string) {
    const rows = await this.prisma.patientConsent.findMany({
      where: { tenantId, employeeId },
      include: consentInclude,
      orderBy: { givenAt: 'desc' },
    });
    const latestByType = new Map<ConsentType, PatientConsentView>();
    for (const row of rows)
      if (!latestByType.has(row.template.type)) latestByType.set(row.template.type, row);
    const active = await this.prisma.consentTemplate.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, type: true, version: true, title: true },
    });
    return active.map((template) => {
      const latest = latestByType.get(template.type) ?? null;
      return {
        type: template.type,
        activeTemplate: template,
        latest,
        /** GIVEN on the version in force; an older version counts as "needs renewal". */
        state:
          !latest || latest.status !== 'GIVEN'
            ? ('MISSING' as const)
            : latest.templateId === template.id
              ? ('CURRENT' as const)
              : ('OUTDATED' as const),
      };
    });
  }

  async give(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: GiveConsentDto,
    ctx: RequestContext,
    /** Set by Belge İmza when the signed PDF already exists. */
    extra: { documentId?: string } = {},
  ): Promise<PatientConsentView> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!employee)
      throw new NotFoundException({
        message: 'Employee not found',
        errorCode: 'EMPLOYEE_NOT_FOUND',
      });
    const template = dto.templateId
      ? await this.prisma.consentTemplate.findFirst({ where: { id: dto.templateId, tenantId } })
      : dto.type
        ? await this.prisma.consentTemplate.findFirst({
            where: { tenantId, type: dto.type, isActive: true },
          })
        : null;
    if (!template)
      throw new BadRequestException({
        message: 'No consent text version to record against',
        errorCode: 'TEMPLATE_NOT_FOUND',
      });
    const open = await this.prisma.patientConsent.findFirst({
      where: { tenantId, employeeId: employee.id, templateId: template.id, status: 'GIVEN' },
      select: { id: true },
    });
    if (open)
      throw new ConflictException({
        message: 'Consent for this text version is already recorded',
        errorCode: 'CONSENT_EXISTS',
      });
    const consent = await this.prisma.patientConsent.create({
      data: {
        tenantId,
        employeeId: employee.id,
        templateId: template.id,
        method: dto.method,
        givenAt: dto.givenAt ? new Date(dto.givenAt) : new Date(),
        note: dto.note ?? null,
        collectedById: actor.id,
        documentId: extra.documentId ?? null,
      },
      include: consentInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'PatientConsent',
      entityId: consent.id,
      newValue: {
        employeeId: employee.id,
        type: template.type,
        version: template.version,
        method: dto.method,
      },
      ...ctx,
    });
    return consent;
  }

  async withdraw(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: WithdrawConsentDto,
    ctx: RequestContext,
  ): Promise<PatientConsentView> {
    const consent = await this.prisma.patientConsent.findFirst({
      where: { id, tenantId },
      include: consentInclude,
    });
    if (!consent)
      throw new NotFoundException({ message: 'Consent not found', errorCode: 'CONSENT_NOT_FOUND' });
    if (consent.status === 'WITHDRAWN') return consent;
    const updated = await this.prisma.patientConsent.update({
      where: { id },
      data: { status: 'WITHDRAWN', withdrawnAt: new Date(), withdrawReason: dto.reason ?? null },
      include: consentInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PatientConsent',
      entityId: id,
      oldValue: { status: 'GIVEN' },
      newValue: {
        status: 'WITHDRAWN',
        employeeId: consent.employeeId,
        type: consent.template.type,
        reason: dto.reason ?? null,
      },
      ...ctx,
    });
    return updated;
  }
}
