import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import { ConsentsService } from '@/modules/consents/consents.service';
import { DocumentsRepository } from '@/modules/documents/documents.repository';
import {
  DocumentsService,
  MAX_UPLOAD_BYTES,
  type UploadedFileLike,
} from '@/modules/documents/documents.service';
import type { SignatureQueryDto, SignConsentDto, SignUploadDto } from './dto/signature.dtos';
import { buildConsentPdf, type SignatureBlock, stampPdf } from './pdf-builder';
import { decodeSignatureDataUrl, prepareSignatureStroke } from './signature-image';

const signatureInclude = {
  document: { select: { id: true, fileName: true, sizeBytes: true, category: true } },
  employee: { select: { id: true, firstName: true, lastName: true, nationalId: true } },
  consent: {
    select: { id: true, status: true, template: { select: { type: true, version: true } } },
  },
  collectedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.DocumentSignatureInclude;

export type DocumentSignatureView = Prisma.DocumentSignatureGetPayload<{
  include: typeof signatureInclude;
}>;

function safeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^\w.\-() ]/g, '_')
    .trim()
    .slice(0, 100);
}

/** Belge İmza: patient signs on the pad; the API renders/stamps the PDF, stores it and keeps a hash for later verification. */
@Injectable()
export class SignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly documents: DocumentsRepository,
    private readonly documentsService: DocumentsService,
    private readonly consents: ConsentsService,
    private readonly audit: AuditService,
  ) {}

  /** Consent text with organisation placeholders filled — what the patient reads before signing. */
  async consentFormText(tenantId: string, templateId: string) {
    const template = await this.prisma.consentTemplate.findFirst({
      where: { id: templateId, tenantId },
    });
    if (!template)
      throw new NotFoundException({
        message: 'Consent text not found',
        errorCode: 'TEMPLATE_NOT_FOUND',
      });
    const org = await this.organization(tenantId);
    return {
      id: template.id,
      type: template.type,
      version: template.version,
      isActive: template.isActive,
      title: template.title,
      body: this.fill(template.body, org),
      organizationName: org.name,
    };
  }

  async signConsent(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: SignConsentDto,
    ctx: RequestContext,
  ): Promise<DocumentSignatureView> {
    const [employee, form] = await Promise.all([
      this.employee(tenantId, dto.employeeId),
      this.consentFormText(tenantId, dto.templateId),
    ]);
    // Cheap checks first so a blank pad is reported before storage is touched.
    const signaturePng = await prepareSignatureStroke(decodeSignatureDataUrl(dto.signature));
    if (!form.isActive)
      throw new BadRequestException({
        message: 'Only the consent text version in force can be signed',
        errorCode: 'TEMPLATE_INACTIVE',
      });
    const open = await this.prisma.patientConsent.findFirst({
      where: { tenantId, employeeId: employee.id, templateId: form.id, status: 'GIVEN' },
      select: { id: true },
    });
    if (open)
      throw new BadRequestException({
        message: 'Consent for this text version is already recorded',
        errorCode: 'CONSENT_EXISTS',
      });

    const documentNo = randomUUID();
    const block: SignatureBlock = {
      signaturePng,
      signerName: dto.signerName?.trim() || `${employee.firstName} ${employee.lastName}`,
      signedAt: new Date(),
      collectorName: `${actor.firstName} ${actor.lastName}`,
      documentNo,
    };
    const pdf = await buildConsentPdf({
      organizationName: form.organizationName,
      title: form.title,
      version: form.version,
      body: form.body,
      patient: {
        fullName: `${employee.firstName} ${employee.lastName}`,
        nationalId: employee.nationalId,
        birthDate: employee.birthDate,
      },
      signature: block,
    });
    const fileName = `${safeFileName(form.title)} v${form.version} - ${safeFileName(`${employee.firstName} ${employee.lastName}`)}.pdf`;
    const stored = await this.store(
      tenantId,
      actor,
      employee.id,
      documentNo,
      fileName,
      pdf,
      signaturePng,
    );
    try {
      const consent = await this.consents.give(
        tenantId,
        actor,
        { employeeId: employee.id, templateId: form.id, method: 'SIGNATURE_PAD' },
        ctx,
        { documentId: stored.document.id },
      );
      return await this.record(
        tenantId,
        actor,
        {
          ...stored,
          employeeId: employee.id,
          consentId: consent.id,
          title: `${form.title} (v${form.version})`,
          block,
        },
        ctx,
      );
    } catch (error) {
      await this.rollback(stored);
      throw error;
    }
  }

  async signUpload(
    tenantId: string,
    actor: AuthenticatedUser,
    file: UploadedFileLike | undefined,
    dto: SignUploadDto,
    ctx: RequestContext,
  ): Promise<DocumentSignatureView> {
    if (!file)
      throw new BadRequestException({ message: 'Missing file', errorCode: 'FILE_REQUIRED' });
    if (file.mimetype !== 'application/pdf')
      throw new BadRequestException({
        message: 'Only PDF files can be signed',
        errorCode: 'UNSUPPORTED_FILE_TYPE',
      });
    if (file.size > MAX_UPLOAD_BYTES)
      throw new BadRequestException({ message: 'File is too large', errorCode: 'FILE_TOO_LARGE' });
    const employee = await this.employee(tenantId, dto.employeeId);
    const signaturePng = await prepareSignatureStroke(decodeSignatureDataUrl(dto.signature));
    const documentNo = randomUUID();
    const block: SignatureBlock = {
      signaturePng,
      signerName: dto.signerName?.trim() || `${employee.firstName} ${employee.lastName}`,
      signedAt: new Date(),
      collectorName: `${actor.firstName} ${actor.lastName}`,
      documentNo,
    };
    let pdf: Buffer;
    try {
      pdf = await stampPdf(file.buffer, block);
    } catch {
      throw new BadRequestException({
        message: 'PDF could not be read (encrypted or corrupt)',
        errorCode: 'PDF_UNREADABLE',
      });
    }
    const fileName = `${safeFileName(dto.title.trim())} - ${safeFileName(`${employee.firstName} ${employee.lastName}`)}.pdf`;
    const stored = await this.store(
      tenantId,
      actor,
      employee.id,
      documentNo,
      fileName,
      pdf,
      signaturePng,
    );
    try {
      return await this.record(
        tenantId,
        actor,
        { ...stored, employeeId: employee.id, consentId: null, title: dto.title.trim(), block },
        ctx,
      );
    } catch (error) {
      await this.rollback(stored);
      throw error;
    }
  }

  async list(tenantId: string, query: SignatureQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const search = query.search?.trim();
    const where: Prisma.DocumentSignatureWhereInput = {
      tenantId,
      document: { deletedAt: null },
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { employee: { firstName: { contains: search, mode: 'insensitive' } } },
              { employee: { lastName: { contains: search, mode: 'insensitive' } } },
              { employee: { nationalId: { startsWith: search } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentSignature.findMany({
        where,
        include: signatureInclude,
        orderBy: { signedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.documentSignature.count({ where }),
    ]);
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string): Promise<DocumentSignatureView> {
    const signature = await this.prisma.documentSignature.findFirst({
      where: { id, tenantId },
      include: signatureInclude,
    });
    if (!signature)
      throw new NotFoundException({
        message: 'Signature record not found',
        errorCode: 'SIGNATURE_NOT_FOUND',
      });
    return signature;
  }

  /** Presigned link to the signed PDF (audited as an export by the documents service). */
  async downloadUrl(tenantId: string, actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const signature = await this.get(tenantId, id);
    return this.documentsService.getDownloadUrl(tenantId, actor, signature.documentId, ctx);
  }

  /** Re-hashes the stored object and compares it with the hash taken at signing time. */
  async verify(tenantId: string, id: string) {
    const signature = await this.get(tenantId, id);
    const document = await this.prisma.document.findFirst({
      where: { id: signature.documentId, tenantId },
      select: { objectKey: true, bucket: true },
    });
    if (!document)
      throw new NotFoundException({
        message: 'Document not found',
        errorCode: 'DOCUMENT_NOT_FOUND',
      });
    const hash = createHash('sha256');
    for await (const chunk of await this.storage.download(document.objectKey, document.bucket))
      hash.update(chunk as Buffer);
    const current = hash.digest('hex');
    return {
      id,
      valid: current === signature.sha256,
      expected: signature.sha256,
      current,
      signedAt: signature.signedAt,
    };
  }

  /* ------------------------------------------------------------- helpers */

  private async employee(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, nationalId: true, birthDate: true },
    });
    if (!employee)
      throw new NotFoundException({
        message: 'Employee not found',
        errorCode: 'EMPLOYEE_NOT_FOUND',
      });
    return employee;
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
        phone: true,
        email: true,
        addressLine: true,
        addressProvince: { select: { name: true } },
        addressDistrict: { select: { name: true } },
      },
    });
    const address = [
      profile?.addressLine,
      profile?.addressDistrict?.name,
      profile?.addressProvince?.name,
    ]
      .filter(Boolean)
      .join(' ');
    const contact = [address, profile?.phone, profile?.email].filter(Boolean).join(' · ');
    return {
      name: profile?.legalName?.trim() || tenant?.name || 'Kurum',
      contact: contact || 'kurum iletişim kanalları',
    };
  }

  private fill(body: string, org: { name: string; contact: string }): string {
    return body
      .replace(/\{\{\s*KURUM_ADI\s*\}\}/g, org.name)
      .replace(/\{\{\s*KURUM_ILETISIM\s*\}\}/g, org.contact);
  }

  /** Uploads the PDF and the signature PNG, then creates the Document row. */
  private async store(
    tenantId: string,
    actor: AuthenticatedUser,
    employeeId: string,
    documentNo: string,
    fileName: string,
    pdf: Buffer,
    signaturePng: Buffer,
  ) {
    const pdfKey = `${tenantId}/signed-forms/${documentNo}.pdf`;
    const signatureKey = `${tenantId}/signed-forms/${documentNo}-signature.png`;
    const sha256 = createHash('sha256').update(pdf).digest('hex');
    const stored = await this.storage.upload({
      key: pdfKey,
      body: pdf,
      contentType: 'application/pdf',
      size: pdf.length,
    });
    try {
      await this.storage.upload({
        key: signatureKey,
        body: signaturePng,
        contentType: 'image/png',
        size: signaturePng.length,
      });
      const document = await this.documents.create(tenantId, {
        category: 'SIGNED_FORM',
        fileName,
        mimeType: 'application/pdf',
        sizeBytes: pdf.length,
        bucket: stored.bucket,
        objectKey: stored.key,
        checksum: stored.etag,
        isMedical: false,
        employeeId,
        uploadedById: actor.id,
      });
      return { document, signatureKey, sha256 };
    } catch (error) {
      await Promise.all([
        this.storage.delete(pdfKey).catch(() => undefined),
        this.storage.delete(signatureKey).catch(() => undefined),
      ]);
      throw error;
    }
  }

  private async record(
    tenantId: string,
    actor: AuthenticatedUser,
    input: {
      document: { id: string };
      signatureKey: string;
      sha256: string;
      employeeId: string;
      consentId: string | null;
      title: string;
      block: SignatureBlock;
    },
    ctx: RequestContext,
  ): Promise<DocumentSignatureView> {
    const signature = await this.prisma.documentSignature.create({
      data: {
        tenantId,
        documentId: input.document.id,
        employeeId: input.employeeId,
        consentId: input.consentId,
        title: input.title,
        signerName: input.block.signerName,
        signedAt: input.block.signedAt,
        collectedById: actor.id,
        signatureKey: input.signatureKey,
        sha256: input.sha256,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent?.slice(0, 300) ?? null,
      },
      include: signatureInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'DocumentSignature',
      entityId: signature.id,
      newValue: {
        employeeId: input.employeeId,
        documentId: input.document.id,
        consentId: input.consentId,
        title: input.title,
        sha256: input.sha256,
      },
      ...ctx,
    });
    return signature;
  }

  private async rollback(stored: {
    document: { id: string; objectKey: string };
    signatureKey: string;
  }) {
    await Promise.all([
      this.prisma.document.delete({ where: { id: stored.document.id } }).catch(() => undefined),
      this.storage.delete(stored.document.objectKey).catch(() => undefined),
      this.storage.delete(stored.signatureKey).catch(() => undefined),
    ]);
  }
}
