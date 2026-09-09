import { randomUUID } from 'node:crypto';
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
    if (dto.isMedical && !hasMedicalAccess(actor)) {
      throw new ForbiddenException({
        message: 'Cannot upload medical documents',
        errorCode: 'MEDICAL_ACCESS_DENIED',
      });
    }

    const fileName = sanitizeFileName(file.originalname);
    const key = `${tenantId}/documents/${randomUUID()}-${fileName}`;
    const stored = await this.storage.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype,
      size: file.size,
    });

    const document = await this.documents.create(tenantId, {
      category: dto.category ?? 'OTHER',
      fileName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      bucket: stored.bucket,
      objectKey: stored.key,
      checksum: stored.etag,
      isMedical: dto.isMedical ?? false,
      employeeId: dto.employeeId,
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
        fileName,
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
      oldValue: { fileName: document.fileName, category: document.category },
      ...ctx,
    });
  }
}
