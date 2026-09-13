import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, type IdentityVerificationResult } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { scopedCompanyFilter, companyScope } from '@/common/policies/company-scope';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Employee } from '@/generated/prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import { CompaniesRepository } from '@/modules/companies/companies.repository';
import { IdentityVerificationService } from '@/modules/identity/identity-verification.service';
import { LocationsService } from '@/modules/locations/locations.service';
import { OccupationsService } from '@/modules/occupations/occupations.service';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { EmployeeQueryDto } from './dto/employee-query.dto';
import type { MarkIdentityVerifiedDto } from './dto/mark-identity-verified.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';
import { assertCanWriteEmployeeNotes, employeeVisibleTo } from './employee-notes.policy';
import { PHOTO_MIME_TYPES, preparePortrait } from './employee-photo';
import { type EmployeeDetail, EmployeesRepository } from './employees.repository';

function toDate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

/** Fields persisted to the audit trail (personal data kept minimal - no national id, phones or address). */
function auditSnapshot(employee: Employee) {
  return {
    companyId: employee.companyId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    registrationNumber: employee.registrationNumber,
    jobTitle: employee.jobTitle,
    department: employee.department,
    status: employee.status,
    identityVerificationStatus: employee.identityVerificationStatus,
    hasPhoto: Boolean(employee.photoUpdatedAt),
  };
}

export interface UploadedPhotoLike {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Identity fields whose change invalidates a previous verification. */
const IDENTITY_FIELDS = ['nationalId', 'firstName', 'lastName', 'birthDate'] as const;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employees: EmployeesRepository,
    private readonly companies: CompaniesRepository,
    private readonly locations: LocationsService,
    private readonly identity: IdentityVerificationService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly storage: StorageService,
    private readonly occupations: OccupationsService,
  ) {}

  async list(tenantId: string, actor: AuthenticatedUser, query: EmployeeQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.employees.findMany(tenantId, skip, take, {
      ...query,
      companyId: scopedCompanyFilter(actor, query.companyId),
    });
    return paginate(
      items.map((employee) => employeeVisibleTo(actor, employee)),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(tenantId: string, id: string): Promise<EmployeeDetail> {
    const employee = await this.employees.findById(tenantId, id);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async getForActor(tenantId: string, actor: AuthenticatedUser, id: string) {
    const employee = await this.employees.findById(tenantId, id, companyScope(actor));
    if (!employee) throw new NotFoundException('Employee not found');
    return employeeVisibleTo(actor, employee);
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateEmployeeDto,
    ctx: RequestContext,
  ): Promise<Employee> {
    assertCanWriteEmployeeNotes(actor, dto.notes);
    await this.assertReferences(tenantId, dto);
    const employee = await this.employees.create(tenantId, {
      ...dto,
      birthDate: toDate(dto.birthDate),
      hireDate: toDate(dto.hireDate),
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Employee',
      entityId: employee.id,
      newValue: auditSnapshot(employee),
      ...ctx,
    });
    return employeeVisibleTo(actor, employee);
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateEmployeeDto,
    ctx: RequestContext,
  ): Promise<Employee> {
    assertCanWriteEmployeeNotes(actor, dto.notes);
    const before = await this.get(tenantId, id);
    await this.assertReferences(tenantId, dto);

    // A change to an identity field drops the previous verification result.
    const identityChanged = IDENTITY_FIELDS.some((field) => {
      const next = dto[field];
      if (next === undefined) return false;
      const current =
        field === 'birthDate' ? before.birthDate?.toISOString().slice(0, 10) : before[field];
      return next !== current;
    });

    const employee = await this.employees.update(tenantId, id, {
      ...dto,
      birthDate: toDate(dto.birthDate),
      hireDate: toDate(dto.hireDate),
      ...(identityChanged && before.identityVerificationStatus !== 'UNVERIFIED'
        ? {
            identityVerificationStatus: 'UNVERIFIED',
            identityVerifiedAt: null,
            identityVerificationSource: null,
          }
        : {}),
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Employee',
      entityId: id,
      oldValue: auditSnapshot(before),
      newValue: { ...auditSnapshot(employee), changedFields: Object.keys(dto) },
      ...ctx,
    });
    return employeeVisibleTo(actor, employee);
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    await this.get(tenantId, id);
    await this.employees.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Employee',
      entityId: id,
      ...ctx,
    });
  }

  /**
   * Second-source check of TC Kimlik No + name + birth year (NVİ KPS when configured).
   * The result is stored on the record; a DISABLED/UNAVAILABLE outcome leaves the status untouched.
   */
  async verifyIdentity(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<{ employee: Employee; result: IdentityVerificationResult }> {
    const employee = await this.get(tenantId, id);
    if (!employee.nationalId || !employee.birthDate) {
      throw new BadRequestException({
        message: 'TC Kimlik No ve doğum tarihi olmadan doğrulama yapılamaz',
        errorCode: 'IDENTITY_INCOMPLETE',
      });
    }
    const result = await this.identity.verify({
      nationalId: employee.nationalId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      birthYear: employee.birthDate.getUTCFullYear(),
    });
    const status =
      result.outcome === 'VERIFIED'
        ? 'VERIFIED'
        : result.outcome === 'MISMATCH'
          ? 'FAILED'
          : undefined;
    const updated = status
      ? await this.employees.update(tenantId, id, {
          identityVerificationStatus: status,
          identityVerifiedAt: status === 'VERIFIED' ? new Date(result.checkedAt) : null,
          identityVerificationSource: result.provider,
        })
      : employee;
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: 'IDENTITY_VERIFICATION',
      entityType: 'Employee',
      entityId: id,
      newValue: { outcome: result.outcome, provider: result.provider },
      ...ctx,
    });
    return { employee: updated, result };
  }

  /** Staff saw the physical document; recorded as MANUAL with who/when in the audit trail. */
  async markIdentityVerified(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: MarkIdentityVerifiedDto,
    ctx: RequestContext,
  ): Promise<Employee> {
    await this.get(tenantId, id);
    const employee = await this.employees.update(tenantId, id, {
      identityVerificationStatus: 'MANUAL',
      identityVerifiedAt: new Date(),
      identityVerificationSource: 'manual',
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: 'IDENTITY_VERIFICATION',
      entityType: 'Employee',
      entityId: id,
      newValue: { outcome: 'MANUAL', note: dto.note },
      ...ctx,
    });
    return employee;
  }

  /** Example background job trigger: queues the employee report generation. */
  async requestReport(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<{ jobId: string }> {
    await this.get(tenantId, id);
    const jobId = await this.queue.enqueueEmployeeReport({
      tenantId,
      employeeId: id,
      requestedByUserId: actor.id,
      format: 'pdf',
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.EXPORT,
      entityType: 'Employee',
      entityId: id,
      newValue: { jobId, format: 'pdf' },
      ...ctx,
    });
    return { jobId };
  }

  private async findPhoto(tenantId: string, id: string) {
    const photo = await this.employees.findPhotoKey(tenantId, id);
    if (!photo) {
      throw new NotFoundException({
        message: 'Employee not found',
        errorCode: 'EMPLOYEE_NOT_FOUND',
      });
    }
    return photo;
  }

  /** Stores (or replaces) the patient's portrait in MinIO; the previous object is removed best effort. */
  async setPhoto(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    file: UploadedPhotoLike | undefined,
    ctx: RequestContext,
  ): Promise<EmployeeDetail> {
    if (!file)
      throw new BadRequestException({ message: 'Missing photo', errorCode: 'PHOTO_REQUIRED' });
    if (!PHOTO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException({
        message: `Unsupported image type: ${file.mimetype}`,
        errorCode: 'UNSUPPORTED_IMAGE_TYPE',
      });
    }
    const before = await this.findPhoto(tenantId, id);
    const photo = await preparePortrait(file.buffer);
    const key = `${tenantId}/employees/${id}/photo-${randomUUID()}.jpg`;
    await this.storage.upload({
      key,
      body: photo.buffer,
      contentType: photo.contentType,
      size: photo.buffer.length,
      metadata: { 'x-amz-meta-employee-id': id },
    });
    await this.employees.update(tenantId, id, { photoKey: key, photoUpdatedAt: new Date() });
    if (before.photoKey) await this.storage.delete(before.photoKey).catch(() => undefined);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Employee',
      entityId: id,
      oldValue: { hasPhoto: Boolean(before.photoKey) },
      newValue: {
        hasPhoto: true,
        photo: { width: photo.width, height: photo.height, bytes: photo.buffer.length },
      },
      ...ctx,
    });
    return this.get(tenantId, id);
  }

  /** Streams the stored portrait; 404 when the patient has none. */
  async getPhoto(
    tenantId: string,
    id: string,
  ): Promise<{ stream: Readable; updatedAt: Date | null }> {
    const photo = await this.findPhoto(tenantId, id);
    if (!photo.photoKey) {
      throw new NotFoundException({
        message: 'Patient has no photo',
        errorCode: 'PHOTO_NOT_FOUND',
      });
    }
    return { stream: await this.storage.download(photo.photoKey), updatedAt: photo.photoUpdatedAt };
  }

  async removePhoto(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    const before = await this.findPhoto(tenantId, id);
    if (!before.photoKey) return;
    await this.employees.update(tenantId, id, { photoKey: null, photoUpdatedAt: null });
    await this.storage.delete(before.photoKey).catch(() => undefined);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Employee',
      entityId: id,
      oldValue: { hasPhoto: true },
      newValue: { hasPhoto: false },
      ...ctx,
    });
  }

  private async assertReferences(tenantId: string, dto: Partial<CreateEmployeeDto>): Promise<void> {
    if (dto.occupationId && !(await this.occupations.exists(tenantId, dto.occupationId))) {
      throw new BadRequestException({
        message: 'Occupation not found',
        errorCode: 'OCCUPATION_NOT_FOUND',
      });
    }
    if (dto.companyId && !(await this.companies.exists(tenantId, dto.companyId))) {
      throw new BadRequestException({
        message: 'Company not found in this tenant',
        errorCode: 'INVALID_COMPANY',
      });
    }
    const addressGiven =
      dto.addressProvinceId !== undefined ||
      dto.addressDistrictId !== undefined ||
      dto.addressNeighborhoodId !== undefined;
    if (
      addressGiven &&
      !(await this.locations.assertConsistent(
        dto.addressProvinceId,
        dto.addressDistrictId,
        dto.addressNeighborhoodId,
      ))
    ) {
      throw new BadRequestException({
        message: 'İl / ilçe / mahalle seçimi tutarsız',
        errorCode: 'INVALID_ADDRESS',
      });
    }
  }
}
