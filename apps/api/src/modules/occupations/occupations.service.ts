import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { AuditService } from '@/modules/audit/audit.service';
import type { CreateOccupationDto } from './dto/create-occupation.dto';
import type { OccupationQueryDto } from './dto/occupation-query.dto';
import type { UpdateOccupationDto } from './dto/update-occupation.dto';
import { DEFAULT_OCCUPATIONS } from './occupation-defaults';
import { occupationNameKey } from './occupation-name';
import { type OccupationRecord, OccupationsRepository } from './occupations.repository';

function snapshot(o: OccupationRecord) {
  return { code: o.code, name: o.name, isActive: o.isActive };
}

@Injectable()
export class OccupationsService {
  constructor(
    private readonly occupations: OccupationsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: OccupationQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.occupations.findMany(tenantId, skip, take, {
      search: query.search,
      isActive: query.isActive,
    });
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string): Promise<OccupationRecord> {
    const occupation = await this.occupations.findById(tenantId, id);
    if (!occupation)
      throw new NotFoundException({
        message: 'Occupation not found',
        errorCode: 'OCCUPATION_NOT_FOUND',
      });
    return occupation;
  }

  exists(tenantId: string, id: string): Promise<boolean> {
    return this.occupations.exists(tenantId, id);
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateOccupationDto,
    ctx: RequestContext,
  ): Promise<OccupationRecord> {
    const name = dto.name.trim();
    const code = dto.code?.trim() || null;
    await this.assertUnique(tenantId, name, code);
    const occupation = await this.occupations.create(tenantId, {
      ...dto,
      name,
      code,
      nameKey: occupationNameKey(name),
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Occupation',
      entityId: occupation.id,
      newValue: snapshot(occupation),
      ...ctx,
    });
    return occupation;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateOccupationDto,
    ctx: RequestContext,
  ): Promise<OccupationRecord> {
    const before = await this.get(tenantId, id);
    const name = dto.name?.trim() ?? before.name;
    const code = dto.code === undefined ? before.code : dto.code?.trim() || null;
    await this.assertUnique(tenantId, name, code, id);
    const data = Object.fromEntries(
      Object.entries({ ...dto, name, code, nameKey: occupationNameKey(name) }).filter(
        ([, v]) => v !== undefined,
      ),
    );
    await this.occupations.update(tenantId, id, data);
    const after = await this.get(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Occupation',
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
    await this.occupations.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Occupation',
      entityId: id,
      oldValue: { ...snapshot(before), employees: before._count.employees },
      ...ctx,
    });
  }

  /** Inserts the bundled starter list, skipping names/codes that already exist. */
  async importDefaults(
    tenantId: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ imported: number; skipped: number }> {
    const existing = await this.occupations.existingKeys(tenantId);
    const rows = DEFAULT_OCCUPATIONS.filter(
      (row) => !existing.names.has(occupationNameKey(row.name)) && !existing.codes.has(row.code),
    );
    if (rows.length > 0) await this.occupations.createMany(tenantId, rows);
    const result = { imported: rows.length, skipped: DEFAULT_OCCUPATIONS.length - rows.length };
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Occupation',
      entityId: null,
      newValue: { importDefaults: result },
      ...ctx,
    });
    return result;
  }

  private async assertUnique(
    tenantId: string,
    name: string,
    code: string | null,
    exceptId?: string,
  ): Promise<void> {
    const taken = await this.occupations.findDuplicate(
      tenantId,
      occupationNameKey(name),
      code,
      exceptId,
    );
    if (taken) {
      throw new ConflictException({
        message: `Already defined: ${taken.name}${taken.code ? ` (${taken.code})` : ''}`,
        errorCode: 'DUPLICATE_OCCUPATION',
      });
    }
  }
}
