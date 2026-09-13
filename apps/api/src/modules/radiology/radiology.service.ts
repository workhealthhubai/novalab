import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { OrthancService } from '@/infrastructure/orthanc/orthanc.service';
import { AuditService } from '@/modules/audit/audit.service';
import { AuthService } from '@/modules/auth/auth.service';
import { EmployeesRepository } from '@/modules/employees/employees.repository';
import { buildOrthancWorklist, createAccessionNumber } from './dicom-worklist';
import type { CreateRadiologyRequestDto } from './dto/create-radiology-request.dto';
import type { LinkStudyDto } from './dto/link-study.dto';
import type { RadiologyQueryDto } from './dto/radiology-query.dto';
import type { RadiologyReportDto } from './dto/radiology-report.dto';
import { RadiologyRepository } from './radiology.repository';
import {
  studyBelongsToRequest,
  type IncomingStudy,
  type StudySummary,
  toStudySummary,
  unlinkedOnly,
} from './study-summary';

function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export const MAX_WORKLIST_ATTEMPTS = 5;
const WORKLIST_RETRY_BASE_MS = 60_000;

function nextWorklistAttempt(attempt: number, now = new Date()): Date {
  const delay = Math.min(WORKLIST_RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1), 60 * 60_000);
  return new Date(now.getTime() + delay);
}

export interface ViewerSession {
  viewerUrl: string;
  previewUrl: string;
  cookie: { name: string; value: string; maxAgeSeconds: number };
}

/**
 * Radiology workflow around Orthanc. The database only stores references to
 * studies; pixel data stays in the PACS. Browser access to DICOMweb goes through
 * Nginx with a short-lived viewer cookie issued here.
 */
@Injectable()
export class RadiologyService {
  constructor(
    private readonly radiology: RadiologyRepository,
    private readonly employees: EmployeesRepository,
    private readonly orthanc: OrthancService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: RadiologyQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.radiology.findMany(tenantId, skip, take, query);
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string) {
    const request = await this.radiology.findById(tenantId, id);
    if (!request) throw new NotFoundException('Radiology request not found');
    return {
      ...request,
      viewerUrl: request.studyInstanceUid
        ? this.orthanc.getViewerUrl(request.studyInstanceUid)
        : null,
      previewUrl: request.orthancStudyId ? this.orthanc.getStudyPreviewUrl(request.id) : null,
    };
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateRadiologyRequestDto,
    ctx: RequestContext,
  ) {
    const employee = await this.employees.findById(tenantId, dto.employeeId);
    if (!employee) {
      throw new BadRequestException({
        message: 'Employee not found in this tenant',
        errorCode: 'INVALID_EMPLOYEE',
      });
    }
    if (dto.examinationId) {
      const examination = await this.radiology.findExaminationContext(tenantId, dto.examinationId);
      if (!examination) {
        throw new BadRequestException({
          message: 'Examination not found in this tenant',
          errorCode: 'INVALID_EXAMINATION',
        });
      }
      if (examination.employeeId !== dto.employeeId) {
        throw new BadRequestException({
          message: 'Examination belongs to a different patient',
          errorCode: 'EXAMINATION_PATIENT_MISMATCH',
        });
      }
    }
    const stationAet = await this.stationAet(tenantId);
    const request = await this.radiology.create(tenantId, {
      ...dto,
      accessionNumber: createAccessionNumber(),
      requestedAt: new Date(),
      worklistStatus: stationAet ? 'PENDING' : 'NOT_CONFIGURED',
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'RadiologyRequest',
      entityId: request.id,
      newValue: {
        employeeId: request.employeeId,
        modality: request.modality,
        bodyPart: request.bodyPart,
        worklistStatus: request.worklistStatus,
      },
      ...ctx,
    });
    if (!stationAet) return request;
    try {
      return await this.publishWorklist(tenantId, actor, request.id, ctx, stationAet);
    } catch {
      // Keep the order with FAILED state so an operator can safely retry it.
      return this.get(tenantId, request.id);
    }
  }

  /** Resolves a StudyInstanceUID in Orthanc and stores the references. */
  async linkStudy(
    tenantId: string,
    actor: AuthenticatedUser | null,
    id: string,
    dto: LinkStudyDto,
    ctx: RequestContext,
  ) {
    const current = await this.get(tenantId, id);
    if (current.status === 'CANCELLED')
      throw new BadRequestException({
        message: 'Cancelled requests cannot be linked',
        errorCode: 'INVALID_STATE',
      });
    const owner = await this.radiology.findStudyOwner(dto.studyInstanceUid);
    if (owner && owner.id !== current.id)
      throw new BadRequestException({
        message: 'This study is already linked to another request',
        errorCode: 'STUDY_ALREADY_LINKED',
      });
    const study = await this.orthanc.findStudyByStudyInstanceUid(dto.studyInstanceUid);
    if (!study) {
      throw new NotFoundException({
        message: 'Study not found in PACS',
        errorCode: 'STUDY_NOT_FOUND',
      });
    }
    const summary = toStudySummary(study);
    if (!studyBelongsToRequest(summary, current)) {
      throw new BadRequestException({
        message: 'The PACS study PatientID or AccessionNumber does not match this request',
        errorCode: 'STUDY_ORDER_MISMATCH',
      });
    }
    let request;
    try {
      request = await this.radiology.update(tenantId, id, {
        studyInstanceUid: dto.studyInstanceUid,
        orthancStudyId: study.ID,
        orthancPatientId: study.ParentPatient,
        status: 'COMPLETED',
        completedAt: new Date(),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException({
          message: 'This study is already linked to another request',
          errorCode: 'STUDY_ALREADY_LINKED',
        });
      }
      throw error;
    }
    if (current.worklistId) {
      try {
        await this.orthanc.deleteWorklist(current.worklistId);
        request = await this.radiology.update(tenantId, id, {
          worklistStatus: 'REMOVED',
          worklistSyncedAt: new Date(),
        });
      } catch {
        request = await this.radiology.update(tenantId, id, {
          worklistStatus: 'FAILED',
          worklistSyncedAt: new Date(),
        });
      }
    }
    await this.audit.log({
      tenantId,
      userId: actor?.id,
      action: AuditAction.UPDATE,
      entityType: 'RadiologyRequest',
      entityId: id,
      newValue: { studyInstanceUid: dto.studyInstanceUid, orthancStudyId: study.ID },
      ...ctx,
    });
    return request;
  }

  async report(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: RadiologyReportDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    if (!before.orthancStudyId) {
      throw new BadRequestException({
        message: 'Link a study before reporting',
        errorCode: 'STUDY_NOT_LINKED',
      });
    }
    const request = await this.radiology.update(tenantId, id, {
      reportText: dto.reportText,
      reportedById: actor.id,
      reportedAt: new Date(),
      status: 'REPORTED',
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'RadiologyRequest',
      entityId: id,
      oldValue: { status: before.status },
      newValue: { status: 'REPORTED' }, // report text is medical data - not audited
      ...ctx,
    });
    return request;
  }

  /** Study tags from the PACS for a linked request (null when the study vanished from Orthanc). */
  async studyDetails(tenantId: string, id: string): Promise<StudySummary | null> {
    const request = await this.get(tenantId, id);
    if (!request.studyInstanceUid) return null;
    const study = await this.orthanc.findStudyByStudyInstanceUid(request.studyInstanceUid);
    if (!study) return null;
    const [detailed] = await this.orthanc.findStudies(
      { StudyInstanceUID: request.studyInstanceUid },
      1,
    );
    return toStudySummary(detailed ?? study);
  }

  /** PACS candidates use accession + PatientID; PatientID-only is kept for legacy rows. */
  async pacsCandidates(tenantId: string, id: string): Promise<StudySummary[]> {
    const request = await this.get(tenantId, id);
    const query: Record<string, string> = request.accessionNumber
      ? { AccessionNumber: request.accessionNumber }
      : { PatientID: request.employeeId };
    const [studies, linked] = await Promise.all([
      this.orthanc.findStudies(query, 20),
      this.radiology.linkedStudyUids(),
    ]);
    return unlinkedOnly(studies.map(toStudySummary), linked).filter((study) =>
      studyBelongsToRequest(study, request),
    );
  }

  /** Incoming studies matched to this tenant's outstanding accession numbers. */
  async unlinkedStudies(tenantId: string, limit: number): Promise<IncomingStudy[]> {
    const orders = await this.radiology.unlinkedOrders(tenantId, Math.min(limit, 25));
    if (orders.length === 0) return [];
    const [results, linked] = await Promise.all([
      Promise.all(
        orders.map((order) =>
          this.orthanc.findStudies(
            order.accessionNumber
              ? { AccessionNumber: order.accessionNumber }
              : { PatientID: order.employeeId },
            5,
          ),
        ),
      ),
      this.radiology.linkedStudyUids(),
    ]);
    return unlinkedOnly(results.flat().map(toStudySummary), linked)
      .flatMap((study) => {
        const order = orders.find((candidate) => studyBelongsToRequest(study, candidate));
        return order ? [{ ...study, requestId: order.id }] : [];
      })
      .slice(0, limit);
  }

  /** Deterministically attaches stable studies by AccessionNumber + PatientID. */
  async reconcilePacs(
    tenantId: string,
    actor: AuthenticatedUser | null,
    limit: number,
    ctx: RequestContext,
  ) {
    const orders = (await this.radiology.unlinkedOrders(tenantId, Math.min(limit, 25))).filter(
      (order) => Boolean(order.accessionNumber),
    );
    let linked = 0;
    let ambiguous = 0;
    for (const order of orders) {
      const studies = await this.orthanc.findStudies(
        { AccessionNumber: order.accessionNumber! },
        2,
      );
      const matches = studies
        .map(toStudySummary)
        .filter((study) => study.isStable && studyBelongsToRequest(study, order));
      if (matches.length !== 1) {
        if (matches.length > 1) ambiguous += 1;
        continue;
      }
      try {
        await this.linkStudy(
          tenantId,
          actor,
          order.id,
          { studyInstanceUid: matches[0]!.studyInstanceUid },
          ctx,
        );
        linked += 1;
      } catch {
        ambiguous += 1;
      }
    }
    return {
      checked: orders.length,
      linked,
      ambiguous,
      waiting: orders.length - linked - ambiguous,
    };
  }

  async retryWorklist(tenantId: string, actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const request = await this.get(tenantId, id);
    if (request.status === 'CANCELLED' || request.studyInstanceUid) {
      throw new BadRequestException({
        message: 'Only an outstanding radiology request can be republished',
        errorCode: 'WORKLIST_INVALID_STATE',
      });
    }
    const stationAet = await this.stationAet(tenantId);
    if (!stationAet) {
      throw new BadRequestException({
        message: 'Configure the radiology station AE Title in organization settings',
        errorCode: 'WORKLIST_NOT_CONFIGURED',
      });
    }
    await this.radiology.update(tenantId, id, {
      worklistAttemptCount: 0,
      worklistNextAttemptAt: null,
      worklistLastError: null,
    });
    return this.publishWorklist(tenantId, actor, id, ctx, stationAet);
  }

  /** Tenants that have an MWL station and can participate in the background PACS sweep. */
  configuredTenantIds() {
    return this.radiology.configuredTenantIds();
  }

  /** Retry due MWL publications/cleanup with a bounded exponential backoff. */
  async retryFailedWorklists(tenantId: string, limit: number, ctx: RequestContext) {
    const stationAet = await this.stationAet(tenantId);
    if (!stationAet) return { checked: 0, recovered: 0, failed: 0 };
    const rows = await this.radiology.retryableWorklists(
      tenantId,
      Math.min(limit, 25),
      MAX_WORKLIST_ATTEMPTS,
      new Date(),
    );
    let recovered = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        if (row.studyInstanceUid) {
          if (row.worklistId) await this.orthanc.deleteWorklist(row.worklistId);
          await this.radiology.update(tenantId, row.id, {
            worklistStatus: 'REMOVED',
            worklistSyncedAt: new Date(),
            worklistNextAttemptAt: null,
            worklistLastError: null,
          });
        } else {
          await this.publishWorklist(tenantId, null, row.id, ctx, stationAet);
        }
        recovered += 1;
      } catch {
        if (row.studyInstanceUid) {
          const attempt = row.worklistAttemptCount + 1;
          await this.radiology.update(tenantId, row.id, {
            worklistAttemptCount: attempt,
            worklistNextAttemptAt:
              attempt < MAX_WORKLIST_ATTEMPTS ? nextWorklistAttempt(attempt) : null,
            worklistLastError: 'WORKLIST_DELETE_FAILED',
          });
        }
        failed += 1;
      }
    }
    return { checked: rows.length, recovered, failed };
  }

  async cancel(tenantId: string, actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const before = await this.get(tenantId, id);
    if (before.status === 'REPORTED' || before.status === 'CANCELLED') {
      throw new BadRequestException({
        message: 'Reported or cancelled requests cannot be cancelled',
        errorCode: 'INVALID_STATE',
      });
    }
    if (before.worklistId && !before.studyInstanceUid) {
      await this.orthanc.deleteWorklist(before.worklistId);
    }
    const request = await this.radiology.update(tenantId, id, {
      status: 'CANCELLED',
      worklistStatus: 'REMOVED',
      worklistSyncedAt: new Date(),
      worklistNextAttemptAt: null,
      worklistLastError: null,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'RadiologyRequest',
      entityId: id,
      oldValue: { status: before.status },
      newValue: { status: 'CANCELLED' },
      ...ctx,
    });
    return request;
  }

  private async stationAet(tenantId: string): Promise<string | null> {
    const profile = await this.radiology.findStationConfiguration(tenantId);
    const aet = profile?.radiologyStationAet?.trim().toUpperCase() ?? '';
    return /^[A-Z0-9_.-]{1,16}$/.test(aet) ? aet : null;
  }

  private async publishWorklist(
    tenantId: string,
    actor: AuthenticatedUser | null,
    id: string,
    ctx: RequestContext,
    stationAet: string,
  ) {
    const request = await this.get(tenantId, id);
    const employee = await this.employees.findById(tenantId, request.employeeId);
    if (!employee || !request.accessionNumber) {
      throw new BadRequestException({
        message: 'The request cannot be published as a DICOM worklist',
        errorCode: 'WORKLIST_INVALID_REQUEST',
      });
    }
    const attempt = request.worklistAttemptCount + 1;
    await this.radiology.update(tenantId, id, {
      worklistStatus: 'PENDING',
      worklistAttemptCount: attempt,
      worklistNextAttemptAt: null,
      worklistLastError: null,
    });
    try {
      const result = await this.orthanc.createWorklist(
        buildOrthancWorklist(employee, {
          accessionNumber: request.accessionNumber,
          modality: request.modality,
          bodyPart: request.bodyPart,
          clinicalInfo: request.clinicalInfo,
          requestedAt: request.requestedAt,
          scheduledStationAet: stationAet,
        }),
      );
      const updated = await this.radiology.update(tenantId, id, {
        worklistId: result.ID,
        worklistStatus: 'PUBLISHED',
        worklistSyncedAt: new Date(),
        worklistNextAttemptAt: null,
        worklistLastError: null,
      });
      await this.audit.log({
        tenantId,
        userId: actor?.id,
        action: AuditAction.UPDATE,
        entityType: 'RadiologyRequest',
        entityId: id,
        newValue: { worklistStatus: 'PUBLISHED', stationAet },
        ...ctx,
      });
      return updated;
    } catch (error) {
      await this.radiology.update(tenantId, id, {
        worklistStatus: 'FAILED',
        worklistSyncedAt: new Date(),
        worklistNextAttemptAt:
          attempt < MAX_WORKLIST_ATTEMPTS ? nextWorklistAttempt(attempt) : null,
        worklistLastError: 'ORTHANC_UNAVAILABLE',
      });
      throw error;
    }
  }

  /** Issues the viewer cookie and returns where to open OHIF. */
  async createViewerSession(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<ViewerSession> {
    const request = await this.get(tenantId, id);
    if (!request.studyInstanceUid) {
      throw new BadRequestException({
        message: 'No study linked to this request',
        errorCode: 'STUDY_NOT_LINKED',
      });
    }
    const { token, maxAgeSeconds } = this.auth.issueDicomWebToken(actor, {
      radiologyRequestId: request.id,
      employeeId: request.employeeId,
      studyInstanceUid: request.studyInstanceUid,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.MEDICAL_DATA_ACCESS,
      entityType: 'RadiologyRequest',
      entityId: request.id,
      metadata: { accessMode: 'DICOM_VIEWER_SESSION', expiresInSeconds: maxAgeSeconds },
      ...ctx,
    });
    return {
      viewerUrl: this.orthanc.getViewerUrl(request.studyInstanceUid),
      previewUrl: this.orthanc.getStudyPreviewUrl(request.id),
      cookie: { name: 'osgb_dicomweb', value: token, maxAgeSeconds },
    };
  }

  async getPreviewImage(tenantId: string, id: string): Promise<Buffer> {
    const request = await this.get(tenantId, id);
    if (!request.orthancStudyId) {
      throw new NotFoundException({
        message: 'No study linked to this request',
        errorCode: 'STUDY_NOT_LINKED',
      });
    }
    return this.orthanc.getStudyPreviewImage(request.orthancStudyId);
  }

  pacsStatus() {
    return this.orthanc.getSystemStatus();
  }

  async pacsOperationsStatus(tenantId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [summary, stationAet, orthanc] = await Promise.all([
      this.radiology.operationsSummary(tenantId, MAX_WORKLIST_ATTEMPTS, today),
      this.stationAet(tenantId),
      this.orthanc
        .getSystemStatus()
        .then((system) => ({
          connection: 'ONLINE' as const,
          name: system.Name,
          version: system.Version,
          dicomAet: system.DicomAet,
          dicomPort: system.DicomPort,
        }))
        .catch(() => ({
          connection: 'OFFLINE' as const,
          name: null,
          version: null,
          dicomAet: null,
          dicomPort: null,
        })),
    ]);
    return {
      checkedAt: new Date().toISOString(),
      stationAet,
      maxWorklistAttempts: MAX_WORKLIST_ATTEMPTS,
      ...orthanc,
      ...summary,
    };
  }
}
