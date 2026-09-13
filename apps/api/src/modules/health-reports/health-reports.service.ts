import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { Readable } from 'node:stream';
import {
  analyzeEcg,
  analyzeEye,
  analyzeSpirometry,
  ageAt,
  AuditAction,
  averageThreshold,
  gradeHearing,
  PTA_FREQUENCIES,
  reportBlockers,
} from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import { toThresholds } from '@/modules/audiometry/audiometry-analysis';
import { DocumentsService } from '@/modules/documents/documents.service';
import { toMeasurementMap } from '@/modules/examinations/examination-comparison';
import {
  assertExaminationApprovalTransition,
  assertExaminationUpdateTransition,
  throwExaminationVersionConflict,
} from '@/modules/examinations/examination-status.policy';
import { ProtocolsService } from '@/modules/protocols/protocols.service';
import type { CreateReportDto, ReportQueryDto, UpdateReportDto } from './dto/health-report.dtos';
import { normalizeAnamnesis, normalizeSystemsExam } from './report-content';
import { assertSigningPhysicianOwnership } from './report-approval.policy';
import { buildReportPdf, type ReportPdfInput } from './report-pdf';
import { visitBlockers } from './report-visit-readiness';
import { laboratoryLines } from './laboratory-summary';
import {
  laboratoryTestScope,
  protocolTestScope,
  radiologyTestScope,
} from './report-test-selection.policy';

const reportInclude = {
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nationalId: true,
      birthDate: true,
      gender: true,
      hireDate: true,
      company: { select: { id: true, name: true } },
      occupation: { select: { id: true, name: true } },
    },
  },
  protocol: {
    select: {
      id: true,
      protocolNumber: true,
      type: true,
      status: true,
      deletedAt: true,
      items: {
        select: { id: true, type: true, status: true, note: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  },
  physicianProfile: {
    select: {
      id: true,
      title: true,
      firstName: true,
      lastName: true,
      specialty: true,
      diplomaNumber: true,
      signatureUpdatedAt: true,
    },
  },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  reportDocument: {
    select: { id: true, fileName: true, sizeBytes: true, checksum: true, createdAt: true },
  },
  measurements: { select: { key: true, value: true, note: true, recordedAt: true } },
} satisfies Prisma.ExaminationInclude;

type ReportRow = Prisma.ExaminationGetPayload<{ include: typeof reportInclude }>;

function dayStart(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000+03:00` : value);
}
function dayEnd(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999+03:00` : value);
}
function physicianName(
  p: { title: string | null; firstName: string; lastName: string } | null,
): string {
  return p ? [p.title, p.firstName, p.lastName].filter(Boolean).join(' ') : '';
}
function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks);
}

function present(row: ReportRow, tests?: TestSummary[]) {
  const { measurements, ...rest } = row;
  const anamnesis = normalizeAnamnesis(row.anamnesis);
  const systemsExam = normalizeSystemsExam(row.systemsExam);
  return {
    ...rest,
    anamnesis,
    systemsExam,
    measurements: toMeasurementMap(measurements),
    blockers: [
      ...reportBlockers({
        performedAt: row.performedAt,
        fitnessDecision: row.fitnessDecision,
        physicianProfileId: row.physicianProfileId,
        restrictions: row.restrictions,
        conclusion: row.conclusion,
      }),
      ...visitBlockers(row.protocol, tests),
    ],
  };
}

export type HealthReportView = ReturnType<typeof present>;

export interface TestSummary {
  module: 'lab' | 'audiometry' | 'spirometry' | 'eye' | 'ecg' | 'radiology' | 'pneumoconiosis';
  id: string;
  performedAt: Date;
  title: string;
  lines: string[];
  alert: boolean;
}

/** Sağlık Raporları: the examination as an Ek-2 style report — content editing, readiness, approval with a signed PDF. */
@Injectable()
export class HealthReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protocols: ProtocolsService,
    private readonly documentsService: DocumentsService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HealthReportsService.name);
  }

  async list(tenantId: string, query: ReportQueryDto) {
    if (query.from && query.to && dayStart(query.from) > dayEnd(query.to))
      throw new BadRequestException('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const search = query.search?.trim();
    const where: Prisma.ExaminationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.companySearch?.trim()
        ? {
            employee: {
              company: {
                tenantId,
                deletedAt: null,
                name: { contains: query.companySearch.trim(), mode: 'insensitive' as const },
              },
            },
          }
        : {}),
      ...(query.physicianSearch?.trim()
        ? {
            physicianProfile: {
              tenantId,
              AND: query.physicianSearch
                .trim()
                .split(/\s+/)
                .map((part) => ({
                  OR: [
                    { firstName: { contains: part, mode: 'insensitive' as const } },
                    { lastName: { contains: part, mode: 'insensitive' as const } },
                  ],
                })),
            },
          }
        : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.fitnessDecision ? { fitnessDecision: query.fitnessDecision } : {}),
      ...(query.from || query.to
        ? {
            OR: [
              {
                performedAt: {
                  ...(query.from ? { gte: dayStart(query.from) } : {}),
                  ...(query.to ? { lte: dayEnd(query.to) } : {}),
                },
              },
              {
                performedAt: null,
                createdAt: {
                  ...(query.from ? { gte: dayStart(query.from) } : {}),
                  ...(query.to ? { lte: dayEnd(query.to) } : {}),
                },
              },
            ],
          }
        : {}),
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { employee: { firstName: { contains: search, mode: 'insensitive' } } },
                  { employee: { lastName: { contains: search, mode: 'insensitive' } } },
                  { employee: { nationalId: { startsWith: search } } },
                  { protocol: { protocolNumber: { contains: search } } },
                ],
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.examination.findMany({
        where,
        include: reportInclude,
        orderBy: [{ performedAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.examination.count({ where }),
    ]);
    return paginate(
      rows.map((row) => present(row)),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(tenantId: string, id: string): Promise<HealthReportView & { tests: TestSummary[] }> {
    const row = await this.row(tenantId, id);
    const tests = await this.testSummaries(tenantId, row, row.approvedAt ?? new Date());
    return { ...present(row, tests), tests };
  }

  /** Latest record per doctor-module for a patient (any protocol) + last report decision — the patient card hub. */
  async patientSummary(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!employee)
      throw new NotFoundException({
        message: 'Employee not found',
        errorCode: 'EMPLOYEE_NOT_FOUND',
      });
    const base = { tenantId, employeeId, deletedAt: null } as const;
    const [audiometry, spirometry, eye, ecg, pneumoconiosis, radiology, report, counts] =
      await Promise.all([
        this.prisma.audiometryTest.findFirst({
          where: base,
          select: { id: true, performedAt: true, ptaRight: true, ptaLeft: true },
          orderBy: { performedAt: 'desc' },
        }),
        this.prisma.spirometryTest.findFirst({
          where: base,
          select: { id: true, performedAt: true, pattern: true },
          orderBy: { performedAt: 'desc' },
        }),
        this.prisma.eyeExamination.findFirst({
          where: base,
          select: { id: true, performedAt: true, recommendation: true },
          orderBy: { performedAt: 'desc' },
        }),
        this.prisma.ecgRecord.findFirst({
          where: base,
          select: { id: true, performedAt: true, interpretation: true },
          orderBy: { performedAt: 'desc' },
        }),
        this.prisma.pneumoconiosisReading.findFirst({
          where: base,
          select: { id: true, readAt: true, result: true, profusion: true },
          orderBy: { readAt: 'desc' },
        }),
        this.prisma.radiologyRequest.findFirst({
          where: base,
          select: { id: true, requestedAt: true, modality: true, bodyPart: true, status: true },
          orderBy: { requestedAt: 'desc' },
        }),
        this.prisma.examination.findFirst({
          where: base,
          select: {
            id: true,
            performedAt: true,
            status: true,
            fitnessDecision: true,
            nextExaminationDue: true,
            reportDocumentId: true,
            protocol: { select: { id: true, protocolNumber: true } },
          },
          orderBy: [{ performedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        }),
        Promise.all([
          this.prisma.audiometryTest.count({ where: base }),
          this.prisma.spirometryTest.count({ where: base }),
          this.prisma.eyeExamination.count({ where: base }),
          this.prisma.ecgRecord.count({ where: base }),
          this.prisma.pneumoconiosisReading.count({ where: base }),
          this.prisma.radiologyRequest.count({ where: base }),
          this.prisma.examination.count({ where: base }),
        ]),
      ]);
    const n = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
    return {
      audiometry: audiometry
        ? {
            ...audiometry,
            ptaRight: n(audiometry.ptaRight),
            ptaLeft: n(audiometry.ptaLeft),
            count: counts[0],
          }
        : { count: counts[0] },
      spirometry: spirometry ? { ...spirometry, count: counts[1] } : { count: counts[1] },
      eye: eye ? { ...eye, count: counts[2] } : { count: counts[2] },
      ecg: ecg ? { ...ecg, count: counts[3] } : { count: counts[3] },
      pneumoconiosis: pneumoconiosis
        ? { ...pneumoconiosis, count: counts[4] }
        : { count: counts[4] },
      radiology: radiology ? { ...radiology, count: counts[5] } : { count: counts[5] },
      report: report ? { ...report, count: counts[6] } : { count: counts[6] },
    };
  }

  /** Opens the report of a protocol: returns the existing examination or creates one. */
  async createForProtocol(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateReportDto,
    ctx: RequestContext,
  ) {
    const protocol = await this.prisma.protocol.findFirst({
      where: { id: dto.protocolId, tenantId, deletedAt: null },
      select: { id: true, employeeId: true, type: true, openedAt: true },
    });
    if (!protocol)
      throw new NotFoundException({
        message: 'Protocol not found',
        errorCode: 'PROTOCOL_NOT_FOUND',
      });
    const existing = await this.prisma.examination.findFirst({
      where: { tenantId, protocolId: protocol.id, deletedAt: null },
      select: { id: true },
    });
    if (existing) return this.get(tenantId, existing.id);
    let row: ReportRow;
    try {
      row = await this.prisma.examination.create({
        data: {
          tenantId,
          employeeId: protocol.employeeId,
          protocolId: protocol.id,
          type: protocol.type,
          status: 'IN_PROGRESS',
          performedAt: new Date(),
          physicianId: actor.id,
        },
        include: reportInclude,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const raced = await this.prisma.examination.findFirst({
          where: { tenantId, protocolId: protocol.id, deletedAt: null },
          select: { id: true },
        });
        if (raced) return this.get(tenantId, raced.id);
      }
      throw error;
    }
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Examination',
      entityId: row.id,
      newValue: {
        employeeId: row.employeeId,
        protocolId: protocol.id,
        type: row.type,
        source: 'health-report',
      },
      ...ctx,
    });
    return this.get(tenantId, row.id);
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateReportDto,
    ctx: RequestContext,
  ) {
    const before = await this.row(tenantId, id);
    const nextStatus = before.status === 'SCHEDULED' ? 'IN_PROGRESS' : before.status;
    assertExaminationUpdateTransition(before.status, nextStatus);
    const expectedVersion = dto.version ?? before.version;
    if (dto.physicianProfileId) {
      const physician = await this.prisma.physician.findFirst({
        where: { id: dto.physicianProfileId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!physician)
        throw new BadRequestException({
          message: 'Physician not found',
          errorCode: 'PHYSICIAN_NOT_FOUND',
        });
    }
    const { count } = await this.prisma.examination.updateMany({
      where: {
        id,
        tenantId,
        deletedAt: null,
        version: expectedVersion,
        status: { not: 'APPROVED' },
      },
      data: {
        ...(dto.performedAt !== undefined ? { performedAt: new Date(dto.performedAt) } : {}),
        ...(dto.physicianProfileId !== undefined
          ? { physicianProfileId: dto.physicianProfileId }
          : {}),
        ...(dto.anamnesis !== undefined
          ? { anamnesis: normalizeAnamnesis(dto.anamnesis) as Prisma.InputJsonValue }
          : {}),
        ...(dto.systemsExam !== undefined
          ? { systemsExam: normalizeSystemsExam(dto.systemsExam) as Prisma.InputJsonValue }
          : {}),
        ...(dto.findings !== undefined ? { findings: dto.findings } : {}),
        ...(dto.conclusion !== undefined ? { conclusion: dto.conclusion } : {}),
        ...(dto.fitnessDecision !== undefined ? { fitnessDecision: dto.fitnessDecision } : {}),
        ...(dto.restrictions !== undefined ? { restrictions: dto.restrictions } : {}),
        ...(dto.nextExaminationDue !== undefined
          ? { nextExaminationDue: dto.nextExaminationDue ? new Date(dto.nextExaminationDue) : null }
          : {}),
        ...(before.status === 'SCHEDULED' ? { status: 'IN_PROGRESS' } : {}),
        version: { increment: 1 },
      },
    });
    if (count !== 1) throwExaminationVersionConflict();
    const row = await this.row(tenantId, id);
    // Clinical text never enters the audit trail; only the decision and the touched sections.
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Examination',
      entityId: id,
      oldValue: { fitnessDecision: before.fitnessDecision },
      newValue: { fitnessDecision: row.fitnessDecision, changedFields: Object.keys(dto) },
      ...ctx,
    });
    return this.get(tenantId, id);
  }

  /** Physician sign-off: validates readiness, renders the PDF, stores it and locks the examination. */
  async approve(tenantId: string, actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const row = await this.row(tenantId, id);
    assertExaminationApprovalTransition(row.status);
    const approvedAt = new Date();
    const tests = await this.testSummaries(tenantId, row, approvedAt);
    const view = present(row, tests);
    if (view.blockers.length > 0)
      throw new BadRequestException({
        message: `Report is not ready: ${view.blockers.join(', ')}`,
        errorCode: 'REPORT_NOT_READY',
        details: { blockers: view.blockers },
      });
    const physician = await this.prisma.physician.findFirst({
      where: { id: row.physicianProfileId!, tenantId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        status: true,
        title: true,
        firstName: true,
        lastName: true,
        specialty: true,
        diplomaNumber: true,
        signatureKey: true,
        user: { select: { status: true, deletedAt: true } },
      },
    });
    if (!physician)
      throw new BadRequestException({
        message: 'Physician not found',
        errorCode: 'PHYSICIAN_NOT_FOUND',
      });
    assertSigningPhysicianOwnership(physician, actor.id);
    const signaturePng = physician.signatureKey
      ? await streamToBuffer(await this.storage.download(physician.signatureKey)).catch(() => null)
      : null;
    const organization = await this.organization(tenantId);
    const reportNo = `${approvedAt.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const input: ReportPdfInput = {
      organization,
      reportNo,
      examination: {
        type: row.type,
        performedAt: row.performedAt!,
        fitnessDecision: row.fitnessDecision,
        restrictions: row.restrictions,
        findings: row.findings,
        conclusion: row.conclusion,
        nextExaminationDue: row.nextExaminationDue,
        anamnesis: view.anamnesis,
        systemsExam: view.systemsExam,
      },
      patient: {
        fullName: `${row.employee.firstName} ${row.employee.lastName}`,
        nationalId: row.employee.nationalId,
        birthDate: row.employee.birthDate,
        gender: row.employee.gender,
        company: row.employee.company?.name ?? null,
        occupation: row.employee.occupation?.name ?? null,
        hireDate: row.employee.hireDate,
      },
      protocolNumber: row.protocol?.protocolNumber ?? null,
      measurements: view.measurements,
      testSummaries: [
        ...tests.map((t) => ({ title: t.title, lines: t.lines })),
        ...(row.protocol?.items
          .filter((item) => item.status === 'CANCELLED')
          .map((item) => ({
            title: `İptal edilen istem: ${item.type}`,
            lines: [item.note ?? 'Gerekçe belirtilmedi'],
          })) ?? []),
      ],
      physician: {
        fullName: physicianName(physician),
        specialty: physician.specialty,
        diplomaNumber: physician.diplomaNumber,
        signaturePng,
      },
      approvedAt,
    };
    const pdf = await buildReportPdf(input);
    const pdfSha256 = createHash('sha256').update(pdf).digest('hex');
    const key = `${tenantId}/reports/${row.id}-${reportNo}.pdf`;
    const stored = await this.storage.upload({
      key,
      body: pdf,
      contentType: 'application/pdf',
      size: pdf.length,
      metadata: { 'x-amz-meta-sha256': pdfSha256 },
    });
    let document: { id: string };
    try {
      document = await this.prisma.$transaction(
        async (tx) => {
          // Recheck the visit and source results after rendering/uploading the PDF. Serializable
          // isolation prevents a concurrent item/result change from racing this final approval.
          const fresh = await tx.examination.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: reportInclude,
          });
          if (!fresh || fresh.version !== row.version) throwExaminationVersionConflict();
          const freshTests = await this.testSummaries(tenantId, fresh, approvedAt, tx);
          const freshBlockers = present(fresh, freshTests).blockers;
          if (
            freshBlockers.length ||
            JSON.stringify(freshTests) !== JSON.stringify(tests) ||
            JSON.stringify(fresh.protocol) !== JSON.stringify(row.protocol)
          ) {
            throw new BadRequestException({
              message:
                'Tetkikler veya protokol değişti. Raporu yenileyip sonuçları tekrar kontrol edin.',
              errorCode: 'REPORT_RESULTS_CHANGED',
              details: { blockers: freshBlockers },
            });
          }
          const created = await tx.document.create({
            data: {
              tenantId,
              category: 'REPORT',
              fileName: `Muayene Raporu ${reportNo} - ${row.employee.firstName} ${row.employee.lastName}.pdf`,
              mimeType: 'application/pdf',
              sizeBytes: pdf.length,
              bucket: stored.bucket,
              objectKey: stored.key,
              checksum: pdfSha256,
              isMedical: true,
              employeeId: row.employeeId,
              examinationId: row.id,
              uploadedById: actor.id,
            },
            select: { id: true },
          });
          const claimed = await tx.examination.updateMany({
            where: {
              id,
              tenantId,
              deletedAt: null,
              version: row.version,
              status: { in: ['IN_PROGRESS', 'COMPLETED'] },
              reportDocumentId: null,
            },
            data: {
              status: 'APPROVED',
              physicianId: actor.id,
              approvedById: actor.id,
              approvedAt,
              reportDocumentId: created.id,
              version: { increment: 1 },
            },
          });
          if (claimed.count !== 1) throwExaminationVersionConflict();
          return created;
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      await this.storage
        .delete(stored.key, stored.bucket)
        .catch((cleanupError: unknown) =>
          this.logger.error(
            { err: cleanupError, examinationId: row.id },
            'Failed to remove unreferenced report object',
          ),
        );
      throw error;
    }
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Examination',
      entityId: id,
      oldValue: { status: row.status },
      newValue: {
        status: 'APPROVED',
        fitnessDecision: row.fitnessDecision,
        reportNo,
        documentId: document.id,
      },
      ...ctx,
    });
    await this.completeProtocolItem(tenantId, actor, row, ctx);
    return this.get(tenantId, id);
  }

  async pdfUrl(tenantId: string, actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const row = await this.row(tenantId, id);
    if (!row.reportDocumentId)
      throw new NotFoundException({
        message: 'Report has not been approved yet',
        errorCode: 'REPORT_NOT_FOUND',
      });
    return this.documentsService.getDownloadUrl(tenantId, actor, row.reportDocumentId, ctx);
  }

  /* ------------------------------------------------------------- helpers */

  private async row(tenantId: string, id: string): Promise<ReportRow> {
    const row = await this.prisma.examination.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: reportInclude,
    });
    if (!row)
      throw new NotFoundException({
        message: 'Examination not found',
        errorCode: 'EXAMINATION_NOT_FOUND',
      });
    return row;
  }

  private async organization(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { name: true },
    });
    const profile = await this.prisma.organizationProfile.findUnique({
      where: { tenantId },
      select: {
        legalName: true,
        authorizationNumber: true,
        phone: true,
        email: true,
        addressLine: true,
      },
    });
    return {
      name: profile?.legalName?.trim() || tenant?.name || 'Kurum',
      authorizationNumber: profile?.authorizationNumber ?? null,
      contact: [profile?.addressLine, profile?.phone, profile?.email].filter(Boolean).join(' · '),
    };
  }

  /** Latest record of each module explicitly linked to this report's visit, bounded by approval. */
  private async testSummaries(
    tenantId: string,
    row: ReportRow,
    cutoff: Date,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<TestSummary[]> {
    const protocolScope = protocolTestScope(
      { id: row.id, tenantId, employeeId: row.employeeId, protocolId: row.protocolId },
      'performedAt',
      cutoff,
    );
    const out: TestSummary[] = [];
    const labScope = laboratoryTestScope(
      { id: row.id, tenantId, employeeId: row.employeeId, protocolId: row.protocolId },
      cutoff,
    );
    const lab = labScope
      ? await db.operationRecord.findFirst({ where: labScope, orderBy: { date: 'desc' } })
      : null;
    const labLines = lab ? laboratoryLines(lab.fields) : [];
    if (lab && labLines.length)
      out.push({
        module: 'lab',
        id: lab.id,
        performedAt: lab.date,
        title: 'Laboratuvar',
        lines: labLines,
        alert: false,
      });
    const audio = protocolScope
      ? await db.audiometryTest.findFirst({
          where: protocolScope,
          orderBy: { performedAt: 'desc' },
        })
      : null;
    if (audio) {
      const r = averageThreshold(toThresholds(audio.airRight), PTA_FREQUENCIES);
      const l = averageThreshold(toThresholds(audio.airLeft), PTA_FREQUENCIES);
      const gr = gradeHearing(r);
      const gl = gradeHearing(l);
      out.push({
        module: 'audiometry',
        id: audio.id,
        performedAt: audio.performedAt,
        title: 'Odyometri',
        lines: [
          `Sağ ${r ?? '—'} dB (${gr?.label ?? '—'})`,
          `Sol ${l ?? '—'} dB (${gl?.label ?? '—'})`,
        ],
        alert: Boolean((gr && gr.key !== 'NORMAL') || (gl && gl.key !== 'NORMAL')),
      });
    }
    const spiro = protocolScope
      ? await db.spirometryTest.findFirst({
          where: protocolScope,
          orderBy: { performedAt: 'desc' },
          include: { employee: { select: { gender: true, birthDate: true } } },
        })
      : null;
    if (spiro) {
      const n = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
      const a = analyzeSpirometry(
        {
          fvc: n(spiro.fvc),
          fev1: n(spiro.fev1),
          ratio: n(spiro.ratio),
          fvcPredicted: n(spiro.fvcPredicted),
          fev1Predicted: n(spiro.fev1Predicted),
          postFev1: n(spiro.postFev1),
        },
        {
          sex: spiro.employee.gender,
          heightCm: spiro.heightCm,
          ageYears: ageAt(spiro.employee.birthDate, spiro.performedAt),
        },
      );
      const pattern = spiro.pattern ?? a.pattern;
      out.push({
        module: 'spirometry',
        id: spiro.id,
        performedAt: spiro.performedAt,
        title: 'Spirometri',
        lines: [
          `FVC ${n(spiro.fvc) ?? '—'} L${a.fvcPercent !== null ? ` (%${a.fvcPercent})` : ''}`,
          `FEV1 ${n(spiro.fev1) ?? '—'} L${a.fev1Percent !== null ? ` (%${a.fev1Percent})` : ''}`,
          `FEV1/FVC %${a.ratio ?? '—'}`,
          `Patern: ${pattern ?? '—'}`,
        ],
        alert: pattern !== null && pattern !== 'NORMAL',
      });
    }
    const eye = protocolScope
      ? await db.eyeExamination.findFirst({
          where: protocolScope,
          orderBy: { performedAt: 'desc' },
        })
      : null;
    if (eye) {
      const n = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
      const a = analyzeEye({
        ...eye,
        farRight: n(eye.farRight),
        farLeft: n(eye.farLeft),
        farRightCorrected: n(eye.farRightCorrected),
        farLeftCorrected: n(eye.farLeftCorrected),
      });
      out.push({
        module: 'eye',
        id: eye.id,
        performedAt: eye.performedAt,
        title: 'Göz',
        lines: [
          `Sağ ${a.bestRight ?? '—'} · Sol ${a.bestLeft ?? '—'}`,
          `Renk görme: ${a.colorVision}`,
          `Öneri: ${eye.recommendation}`,
        ],
        alert: eye.recommendation !== 'NONE',
      });
    }
    const ecg = protocolScope
      ? await db.ecgRecord.findFirst({
          where: protocolScope,
          orderBy: { performedAt: 'desc' },
        })
      : null;
    if (ecg) {
      const a = analyzeEcg(ecg, row.employee.gender);
      out.push({
        module: 'ecg',
        id: ecg.id,
        performedAt: ecg.performedAt,
        title: 'EKG',
        lines: [
          `${ecg.heartRate ?? '—'}/dk`,
          `${ecg.rhythm ?? '—'}`,
          `QTc ${a.qtc ?? '—'} ms`,
          `Yorum: ${ecg.interpretation}`,
        ],
        alert: ecg.interpretation !== 'NORMAL',
      });
    }
    const radiology = await db.radiologyRequest.findFirst({
      where: radiologyTestScope(
        { id: row.id, tenantId, employeeId: row.employeeId, protocolId: row.protocolId },
        cutoff,
      ),
      orderBy: { requestedAt: 'desc' },
    });
    if (radiology?.reportText?.trim())
      out.push({
        module: 'radiology',
        id: radiology.id,
        performedAt: radiology.requestedAt,
        title: 'Radyoloji',
        lines: [`${radiology.modality} ${radiology.bodyPart ?? ''}`.trim(), radiology.reportText],
        alert: false,
      });
    const pneumoScope = protocolTestScope(
      { id: row.id, tenantId, employeeId: row.employeeId, protocolId: row.protocolId },
      'readAt',
      cutoff,
    );
    const pneumo = pneumoScope
      ? await db.pneumoconiosisReading.findFirst({
          where: pneumoScope,
          orderBy: { readAt: 'desc' },
        })
      : null;
    if (pneumo)
      out.push({
        module: 'pneumoconiosis',
        id: pneumo.id,
        performedAt: pneumo.readAt,
        title: 'Pnömokonyoz (ILO)',
        lines: [
          `Profüzyon ${pneumo.profusion ?? '—'}`,
          `Büyük opasite ${pneumo.largeOpacity}`,
          `Sonuç: ${pneumo.result}`,
        ],
        alert: pneumo.result !== 'NEGATIVE',
      });
    return out;
  }

  private async completeProtocolItem(
    tenantId: string,
    actor: AuthenticatedUser,
    row: ReportRow,
    ctx: RequestContext,
  ) {
    if (!row.protocolId) return;
    try {
      const protocol = await this.protocols.get(tenantId, row.protocolId);
      const item = protocol.items.find((i) => i.type === 'HEALTH_REPORT' && i.status === 'PENDING');
      if (item)
        await this.protocols.updateItem(
          tenantId,
          actor,
          protocol.id,
          item.id,
          { status: 'DONE' },
          ctx,
        );
    } catch (error) {
      this.logger.warn(
        { err: error, protocolId: row.protocolId },
        'health report: protocol item not completed',
      );
    }
  }
}
