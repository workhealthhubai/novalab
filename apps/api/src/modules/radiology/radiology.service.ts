import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { OrthancService } from '@/infrastructure/orthanc/orthanc.service';
import { AuditService } from '@/modules/audit/audit.service';
import { AuthService } from '@/modules/auth/auth.service';
import { EmployeesRepository } from '@/modules/employees/employees.repository';
import type { CreateRadiologyRequestDto } from './dto/create-radiology-request.dto';
import type { LinkStudyDto } from './dto/link-study.dto';
import type { RadiologyQueryDto } from './dto/radiology-query.dto';
import type { RadiologyReportDto } from './dto/radiology-report.dto';
import { RadiologyRepository } from './radiology.repository';
import { type StudySummary, toStudySummary, unlinkedOnly } from './study-summary';

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
    if (!(await this.employees.exists(tenantId, dto.employeeId))) {
      throw new BadRequestException({
        message: 'Employee not found in this tenant',
        errorCode: 'INVALID_EMPLOYEE',
      });
    }
    const request = await this.radiology.create(tenantId, dto);
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
      },
      ...ctx,
    });
    return request;
  }

  /** Resolves a StudyInstanceUID in Orthanc and stores the references. */
  async linkStudy(
    tenantId: string,
    actor: AuthenticatedUser,
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
    const linked = await this.radiology.linkedStudyUids(tenantId);
    if (linked.has(dto.studyInstanceUid) && current.studyInstanceUid !== dto.studyInstanceUid)
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
    const request = await this.radiology.update(tenantId, id, {
      studyInstanceUid: dto.studyInstanceUid,
      orthancStudyId: study.ID,
      orthancPatientId: study.ParentPatient,
      status: 'COMPLETED',
      completedAt: new Date(),
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
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

  /**
   * PACS studies that probably belong to the request's patient: PatientID equal to the employee id
   * or the TC Kimlik No, plus a family^given name match. Already linked studies are excluded.
   */
  async pacsCandidates(tenantId: string, id: string): Promise<StudySummary[]> {
    const request = await this.get(tenantId, id);
    const employee = await this.employees.findById(tenantId, request.employeeId);
    if (!employee) return [];
    const queries: Array<Record<string, string>> = [{ PatientID: employee.id }];
    if (employee.nationalId) queries.push({ PatientID: employee.nationalId });
    const family = employee.lastName.toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜ ]/g, '');
    const given = employee.firstName.toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜ ]/g, '');
    if (family && given) queries.push({ PatientName: `${family}^${given}*` });
    const results = await Promise.all(queries.map((q) => this.orthanc.findStudies(q, 20)));
    const linked = await this.radiology.linkedStudyUids(tenantId);
    return unlinkedOnly(results.flat().map(toStudySummary), linked);
  }

  /** Newest PACS studies not yet attached to any request of the tenant (worklist of incoming images). */
  async unlinkedStudies(tenantId: string, limit: number): Promise<StudySummary[]> {
    const [studies, linked] = await Promise.all([
      this.orthanc.findStudies({}, Math.min(limit * 2, 100)),
      this.radiology.linkedStudyUids(tenantId),
    ]);
    return unlinkedOnly(studies.map(toStudySummary), linked).slice(0, limit);
  }

  async cancel(tenantId: string, actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const before = await this.get(tenantId, id);
    if (before.status === 'REPORTED' || before.status === 'CANCELLED') {
      throw new BadRequestException({
        message: 'Reported or cancelled requests cannot be cancelled',
        errorCode: 'INVALID_STATE',
      });
    }
    const request = await this.radiology.update(tenantId, id, { status: 'CANCELLED' });
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

  /** Issues the viewer cookie and returns where to open OHIF. */
  async createViewerSession(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
  ): Promise<ViewerSession> {
    const request = await this.get(tenantId, id);
    if (!request.studyInstanceUid) {
      throw new BadRequestException({
        message: 'No study linked to this request',
        errorCode: 'STUDY_NOT_LINKED',
      });
    }
    const { token, maxAgeSeconds } = this.auth.issueDicomWebToken(actor);
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
}
