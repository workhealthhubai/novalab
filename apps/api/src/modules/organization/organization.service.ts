import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import { LocationsService } from '@/modules/locations/locations.service';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import { LOGO_MIME_TYPES, prepareLogo } from './organization-logo';

export interface UploadedLogoLike {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const profileInclude = {
  addressProvince: { select: { id: true, name: true } },
  addressDistrict: { select: { id: true, name: true } },
} satisfies Prisma.OrganizationProfileInclude;

/** Kurum Bilgileri: tenant display name + the organization profile (created lazily). */
@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly locations: LocationsService,
    private readonly audit: AuditService,
  ) {}

  async get(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true, name: true, slug: true, status: true },
    });
    if (!tenant)
      throw new NotFoundException({ message: 'Tenant not found', errorCode: 'TENANT_NOT_FOUND' });
    const profile =
      (await this.prisma.organizationProfile.findUnique({
        where: { tenantId },
        include: profileInclude,
      })) ??
      (await this.prisma.organizationProfile.create({
        data: { tenantId },
        include: profileInclude,
      }));
    return { ...tenant, profile };
  }

  async update(actor: AuthenticatedUser, dto: UpdateOrganizationDto, ctx: RequestContext) {
    const tenantId = actor.tenantId;
    const before = await this.get(tenantId);
    const { name, ...fields } = dto;
    const provinceId = fields.addressProvinceId ?? before.profile.addressProvinceId;
    const districtId = fields.addressDistrictId ?? before.profile.addressDistrictId;
    if (!(await this.locations.assertConsistent(provinceId, districtId, null))) {
      throw new BadRequestException({
        message: 'District does not belong to the province',
        errorCode: 'ADDRESS_MISMATCH',
      });
    }
    if (name !== undefined) {
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { name } });
    }
    const data: Prisma.OrganizationProfileUncheckedUpdateInput = {
      ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
      ...(fields.authorizationDate !== undefined
        ? {
            authorizationDate: fields.authorizationDate ? new Date(fields.authorizationDate) : null,
          }
        : {}),
    };
    await this.prisma.organizationProfile.update({ where: { tenantId }, data });
    const after = await this.get(tenantId);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'OrganizationProfile',
      entityId: after.profile.id,
      oldValue: this.snapshot(before),
      newValue: { ...this.snapshot(after), changedFields: Object.keys(dto) },
      ...ctx,
    });
    return after;
  }

  async setLogo(actor: AuthenticatedUser, file: UploadedLogoLike | undefined, ctx: RequestContext) {
    if (!file)
      throw new BadRequestException({ message: 'Missing logo', errorCode: 'LOGO_REQUIRED' });
    if (!LOGO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException({
        message: `Unsupported image type: ${file.mimetype}`,
        errorCode: 'UNSUPPORTED_IMAGE_TYPE',
      });
    }
    const tenantId = actor.tenantId;
    const before = await this.findLogo(tenantId);
    const logo = await prepareLogo(file.buffer);
    const key = `${tenantId}/organization/logo-${randomUUID()}.png`;
    await this.storage.upload({
      key,
      body: logo.buffer,
      contentType: 'image/png',
      size: logo.buffer.length,
    });
    await this.prisma.organizationProfile.update({
      where: { tenantId },
      data: { logoKey: key, logoUpdatedAt: new Date() },
    });
    if (before.logoKey) await this.storage.delete(before.logoKey).catch(() => undefined);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'OrganizationProfile',
      entityId: before.id,
      newValue: { logo: { width: logo.width, height: logo.height, bytes: logo.buffer.length } },
      ...ctx,
    });
    return this.get(tenantId);
  }

  async getLogo(tenantId: string): Promise<{ stream: Readable; updatedAt: Date | null }> {
    const profile = await this.findLogo(tenantId);
    if (!profile.logoKey)
      throw new NotFoundException({ message: 'No logo', errorCode: 'LOGO_NOT_FOUND' });
    return {
      stream: await this.storage.download(profile.logoKey),
      updatedAt: profile.logoUpdatedAt,
    };
  }

  async removeLogo(actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const tenantId = actor.tenantId;
    const before = await this.findLogo(tenantId);
    if (!before.logoKey) return;
    await this.prisma.organizationProfile.update({
      where: { tenantId },
      data: { logoKey: null, logoUpdatedAt: null },
    });
    await this.storage.delete(before.logoKey).catch(() => undefined);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'OrganizationProfile',
      entityId: before.id,
      newValue: { logo: null },
      ...ctx,
    });
  }

  private async findLogo(tenantId: string) {
    await this.get(tenantId); // ensures the profile row exists
    const profile = await this.prisma.organizationProfile.findUnique({
      where: { tenantId },
      select: { id: true, logoKey: true, logoUpdatedAt: true },
    });
    if (!profile)
      throw new NotFoundException({ message: 'Profile not found', errorCode: 'PROFILE_NOT_FOUND' });
    return profile;
  }

  private snapshot(org: Awaited<ReturnType<OrganizationService['get']>>) {
    const { profile } = org;
    return {
      name: org.name,
      legalName: profile.legalName,
      taxNumber: profile.taxNumber,
      taxOffice: profile.taxOffice,
      sgkRegistrationNumber: profile.sgkRegistrationNumber,
      authorizationNumber: profile.authorizationNumber,
      responsibleManager: profile.responsibleManager,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      addressProvinceId: profile.addressProvinceId,
      addressDistrictId: profile.addressDistrictId,
      radiologyStationAet: profile.radiologyStationAet,
    };
  }
}
