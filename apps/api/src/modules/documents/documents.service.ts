import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, MEDICAL_PERMISSIONS } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Document } from '@/generated/prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import type { DocumentQueryDto } from './dto/document-query.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';
import { isMedicalDocument } from './document-policy';
import { DocumentsRepository } from './documents.repository';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()\s]/g, '_').slice(0, 150);
}

function hasMedicalAccess(user: AuthenticatedUser): boolean {
  return user.permissions.some((p) => MEDICAL_PERMISSIONS.includes(p));
}

/**
 * Documents live in MinIO; the database stores metadata + object key.
 * Object keys are always prefixed with the tenant id, which gives a second
 * layer of isolation inside the bucket.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly documents: DocumentsRepository,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, actor: AuthenticatedUser, query: DocumentQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.documents.findMany(tenantId, skip, take, {
      ...query,
      includeMedical: hasMedicalAccess(actor),
    });
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, actor: AuthenticatedUser, id: string): Promise<Document> {
    const document = await this.documents.findById(tenantId, id);
    if (!document) throw new NotFoundException('Document not found');
    if (document.isMedical && !hasMedicalAccess(actor)) {
      throw new ForbiddenException({
        message: 'Medical document access denied',
        errorCode: 'MEDICAL_ACCESS_DENIED',
      });
    }
    return document;
  }

  async updateExpiry(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    expiresAt: string | null,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, actor, id);
    const result = await this.documents.updateExpiry(
      tenantId,
      id,
      expiresAt ? new Date(expiresAt) : null,
    );
    if (!result.count) throw new NotFoundException('Document not found');
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Document',
      entityId: id,
      oldValue: { expiresAt: before.expiresAt },
      newValue: { expiresAt },
      ...ctx,
    });
    return this.get(tenantId, actor, id);
  }

  async upload(
    tenantId: string,
    actor: AuthenticatedUser,
    file: UploadedFileLike | undefined,
    dto: UploadDocumentDto,
    ctx: RequestContext,
  ) {
    if (!file)
      throw new BadRequestException({ message: 'Missing file', errorCode: 'FILE_REQUIRED' });
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException({
        message: `Unsupported file type: ${file.mimetype}`,
        errorCode: 'UNSUPPORTED_FILE_TYPE',
      });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException({ message: 'File is too large', errorCode: 'FILE_TOO_LARGE' });
    }
    const category = dto.category ?? 'OTHER';
    const relations = await this.resolveUploadRelations(tenantId, dto);
    const isMedical = isMedicalDocument({
      requestedMedical: dto.isMedical,
      category,
      examinationId: dto.examinationId,
    });
    if (isMedical && !hasMedicalAccess(actor)) {
      throw new ForbiddenException({
        message: 'Cannot upload medical documents',
        errorCode: 'MEDICAL_ACCESS_DENIED',
      });
    }

    const fileName = sanitizeFileName(file.originalname);
    const key = `${tenantId}/documents/${randomUUID()}-${fileName}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const stored = await this.storage.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype,
      size: file.size,
      metadata: { 'x-amz-meta-sha256': checksum },
    });

    const document = await this.documents.create(tenantId, {
      category,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      fileName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      bucket: stored.bucket,
      objectKey: stored.key,
      checksum,
      isMedical,
      employeeId: relations.employeeId,
      companyId: dto.companyId,
      examinationId: dto.examinationId,
      uploadedById: actor.id,
    });

    await this.queue.enqueueDocumentProcessing({ tenantId, documentId: document.id });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Document',
      entityId: document.id,
      newValue: {
        mimeType: file.mimetype,
        sizeBytes: file.size,
        category: document.category,
        isMedical: document.isMedical,
      },
      ...ctx,
    });
    return document;
  }

  async getDownloadUrl(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ) {
    const document = await this.get(tenantId, actor, id);
    const expiresInSeconds = document.isMedical ? 120 : 900;
    const url = await this.storage.getPresignedUrl(document.objectKey, {
      bucket: document.bucket,
      expiresInSeconds,
      downloadFileName: document.fileName,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.EXPORT,
      entityType: 'Document',
      entityId: id,
      newValue: { isMedical: document.isMedical },
      ...ctx,
    });
    return { url, expiresIn: expiresInSeconds };
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    const document = await this.get(tenantId, actor, id);
    // Soft delete only; the object stays in MinIO for retention. TODO: lifecycle/purge job.
    await this.documents.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Document',
      entityId: id,
      oldValue: { category: document.category, isMedical: document.isMedical },
      ...ctx,
    });
  }

  private async resolveUploadRelations(tenantId: string, dto: UploadDocumentDto) {
    const [employee, companyExists, examination] = await Promise.all([
      dto.employeeId
        ? this.documents.findEmployeeContext(tenantId, dto.employeeId)
        : Promise.resolve(null),
      dto.companyId ? this.documents.companyExists(tenantId, dto.companyId) : Promise.resolve(true),
      dto.examinationId
        ? this.documents.findExaminationContext(tenantId, dto.examinationId)
        : Promise.resolve(null),
    ]);

    if (dto.employeeId && !employee)
      throw new BadRequestException({
        message: 'Employee not found in this tenant',
        errorCode: 'INVALID_EMPLOYEE',
      });
    if (!companyExists)
      throw new BadRequestException({
        message: 'Company not found in this tenant',
        errorCode: 'INVALID_COMPANY',
      });
    if (dto.examinationId && !examination)
      throw new BadRequestException({
        message: 'Examination not found in this tenant',
        errorCode: 'INVALID_EXAMINATION',
      });
    if (
      examination &&
      (examination.employee.deletedAt || examination.employee.tenantId !== tenantId)
    )
      throw new BadRequestException({
        message: 'Examination patient is not active in this tenant',
        errorCode: 'INVALID_EXAMINATION_EMPLOYEE',
      });

    const employeeId = examination?.employeeId ?? employee?.id;
    if (examination && employee && examination.employeeId !== employee.id)
      throw new BadRequestException({
        message: 'Document employee does not match the examination patient',
        errorCode: 'DOCUMENT_EMPLOYEE_MISMATCH',
      });

    const employeeCompanyId = examination?.employee.companyId ?? employee?.companyId;
    if (dto.companyId && employeeId && employeeCompanyId !== dto.companyId)
      throw new BadRequestException({
        message: 'Document company does not match the patient company',
        errorCode: 'DOCUMENT_COMPANY_MISMATCH',
      });

    return { employeeId };
  }
}
