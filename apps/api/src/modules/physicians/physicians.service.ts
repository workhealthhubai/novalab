import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import type { CreatePhysicianDto } from './dto/create-physician.dto';
import type { PhysicianQueryDto } from './dto/physician-query.dto';
import type { UpdatePhysicianDto } from './dto/update-physician.dto';
import { prepareSignature, SIGNATURE_MIME_TYPES } from './physician-signature';
import { type PhysicianDetail, PhysiciansRepository } from './physicians.repository';

export interface UploadedSignatureLike {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function snapshot(p: PhysicianDetail) {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    title: p.title,
    specialty: p.specialty,
    diplomaNumber: p.diplomaNumber,
    certificateNumber: p.certificateNumber,
    userId: p.userId,
    status: p.status,
    hasSignature: Boolean(p.signatureUpdatedAt),
  };
}

@Injectable()
export class PhysiciansService {
  constructor(
    private readonly physicians: PhysiciansRepository,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: PhysicianQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.physicians.findMany(tenantId, skip, take, {
      search: query.search,
      status: query.status,
    });
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string): Promise<PhysicianDetail> {
    const physician = await this.physicians.findById(tenantId, id);
    if (!physician)
      throw new NotFoundException({
        message: 'Physician not found',
        errorCode: 'PHYSICIAN_NOT_FOUND',
      });
    return physician;
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreatePhysicianDto,
    ctx: RequestContext,
  ) {
    await this.assertUserLink(tenantId, dto.userId ?? null);
    const physician = await this.physicians.create(tenantId, {
      ...dto,
      status: dto.status ?? 'ACTIVE',
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Physician',
      entityId: physician.id,
      newValue: snapshot(physician),
      ...ctx,
    });
    return physician;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdatePhysicianDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    if (dto.userId !== undefined) await this.assertUserLink(tenantId, dto.userId, id);
    await this.physicians.update(
      tenantId,
      id,
      Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)),
    );
    const after = await this.get(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Physician',
      entityId: id,
      oldValue: snapshot(before),
      newValue: { ...snapshot(after), changedFields: Object.keys(dto) },
      ...ctx,
    });
    return after;
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    const before = await this.get(tenantId, id);
    await this.physicians.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Physician',
      entityId: id,
      oldValue: snapshot(before),
      ...ctx,
    });
  }

  async setSignature(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    file: UploadedSignatureLike | undefined,
    ctx: RequestContext,
  ) {
    if (!file)
      throw new BadRequestException({
        message: 'Missing signature image',
        errorCode: 'SIGNATURE_REQUIRED',
      });
    if (!SIGNATURE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException({
        message: `Unsupported image type: ${file.mimetype}`,
        errorCode: 'UNSUPPORTED_IMAGE_TYPE',
      });
    }
    const before = await this.findSignature(tenantId, id);
    const signature = await prepareSignature(file.buffer);
    const key = `${tenantId}/physicians/${id}/signature-${randomUUID()}.png`;
    await this.storage.upload({
      key,
      body: signature.buffer,
      contentType: 'image/png',
      size: signature.buffer.length,
    });
    await this.physicians.update(tenantId, id, {
      signatureKey: key,
      signatureUpdatedAt: new Date(),
    });
    if (before.signatureKey) await this.storage.delete(before.signatureKey).catch(() => undefined);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Physician',
      entityId: id,
      newValue: {
        signature: {
          width: signature.width,
          height: signature.height,
          bytes: signature.buffer.length,
        },
      },
      ...ctx,
    });
    return this.get(tenantId, id);
  }

  async getSignature(
    tenantId: string,
    id: string,
  ): Promise<{ stream: Readable; updatedAt: Date | null }> {
    const signature = await this.findSignature(tenantId, id);
    if (!signature.signatureKey)
      throw new NotFoundException({ message: 'No signature', errorCode: 'SIGNATURE_NOT_FOUND' });
    return {
      stream: await this.storage.download(signature.signatureKey),
      updatedAt: signature.signatureUpdatedAt,
    };
  }

  async removeSignature(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    const before = await this.findSignature(tenantId, id);
    if (!before.signatureKey) return;
    await this.physicians.update(tenantId, id, { signatureKey: null, signatureUpdatedAt: null });
    await this.storage.delete(before.signatureKey).catch(() => undefined);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Physician',
      entityId: id,
      newValue: { signature: null },
      ...ctx,
    });
  }

  private async findSignature(tenantId: string, id: string) {
    const signature = await this.physicians.findSignature(tenantId, id);
    if (!signature)
      throw new NotFoundException({
        message: 'Physician not found',
        errorCode: 'PHYSICIAN_NOT_FOUND',
      });
    return signature;
  }

  /** A user may back at most one physician record and must belong to the tenant. */
  private async assertUserLink(
    tenantId: string,
    userId: string | null,
    exceptId?: string,
  ): Promise<void> {
    if (!userId) return;
    if (!(await this.physicians.userExists(tenantId, userId))) {
      throw new BadRequestException({ message: 'User not found', errorCode: 'USER_NOT_FOUND' });
    }
    const taken = await this.physicians.findByUser(tenantId, userId, exceptId);
    if (taken) {
      throw new ConflictException({
        message: `User is already linked to ${taken.firstName} ${taken.lastName}`,
        errorCode: 'USER_ALREADY_LINKED',
      });
    }
  }
}
