import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { AuditService } from '@/modules/audit/audit.service';
import { normalizeTestCode } from '@/modules/tests/test-code';
import type { CreateTestPackageDto, TestPackageItemDto } from './dto/create-test-package.dto';
import type { TestPackageQueryDto } from './dto/test-package-query.dto';
import type { UpdateTestPackageDto } from './dto/update-test-package.dto';
import { packageTotals } from './package-pricing';
import { type TestPackageRecord, TestPackagesRepository } from './test-packages.repository';

/** API shape: the record plus server-computed totals (so every client shows the same numbers). */
export type TestPackageView = TestPackageRecord & { totals: ReturnType<typeof packageTotals> };

function withTotals(pkg: TestPackageRecord): TestPackageView {
  const items = pkg.items.map((item) => ({
    quantity: item.quantity,
    unitPrice: Number(item.test.unitPrice),
    vatRate: item.test.vatRate,
  }));
  return {
    ...pkg,
    totals: packageTotals(items, pkg.price === null ? null : Number(pkg.price), pkg.vatRate),
  };
}

function snapshot(pkg: TestPackageRecord) {
  return {
    code: pkg.code,
    name: pkg.name,
    price: pkg.price?.toString() ?? null,
    vatRate: pkg.vatRate,
    isActive: pkg.isActive,
    tests: pkg.items.map((i) => `${i.test.code}x${i.quantity}`),
  };
}

function normaliseItems(items: TestPackageItemDto[]): Array<{ testId: string; quantity: number }> {
  const seen = new Set<string>();
  const out: Array<{ testId: string; quantity: number }> = [];
  for (const item of items) {
    if (seen.has(item.testId)) continue;
    seen.add(item.testId);
    out.push({ testId: item.testId, quantity: item.quantity ?? 1 });
  }
  return out;
}

@Injectable()
export class TestPackagesService {
  constructor(
    private readonly packages: TestPackagesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: TestPackageQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.packages.findMany(tenantId, skip, take, {
      search: query.search,
      isActive: query.isActive,
    });
    return paginate(items.map(withTotals), query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string): Promise<TestPackageView> {
    const pkg = await this.packages.findById(tenantId, id);
    if (!pkg)
      throw new NotFoundException({ message: 'Package not found', errorCode: 'PACKAGE_NOT_FOUND' });
    return withTotals(pkg);
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateTestPackageDto,
    ctx: RequestContext,
  ): Promise<TestPackageView> {
    const code = normalizeTestCode(dto.code);
    await this.assertCodeFree(tenantId, code);
    const items = normaliseItems(dto.items);
    await this.assertTests(tenantId, items);
    const { items: _items, ...fields } = dto;
    const pkg = await this.packages.create(tenantId, { ...fields, code }, items);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'TestPackage',
      entityId: pkg.id,
      newValue: snapshot(pkg),
      ...ctx,
    });
    return withTotals(pkg);
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateTestPackageDto,
    ctx: RequestContext,
  ): Promise<TestPackageView> {
    const before = await this.get(tenantId, id);
    const code = dto.code !== undefined ? normalizeTestCode(dto.code) : undefined;
    if (code !== undefined && code !== before.code) await this.assertCodeFree(tenantId, code, id);
    const items = dto.items ? normaliseItems(dto.items) : undefined;
    if (items) await this.assertTests(tenantId, items);
    const { items: _items, ...fields } = dto;
    const data = Object.fromEntries(
      Object.entries({ ...fields, code }).filter(([, v]) => v !== undefined),
    );
    await this.packages.update(tenantId, id, data, items);
    const after = await this.get(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'TestPackage',
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
    await this.packages.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'TestPackage',
      entityId: id,
      oldValue: snapshot(before),
      ...ctx,
    });
  }

  private async assertCodeFree(tenantId: string, code: string, exceptId?: string): Promise<void> {
    const taken = await this.packages.findByCode(tenantId, code, exceptId);
    if (taken)
      throw new ConflictException({
        message: `Code ${code} is already used by ${taken.name}`,
        errorCode: 'DUPLICATE_PACKAGE_CODE',
      });
  }

  private async assertTests(tenantId: string, items: Array<{ testId: string }>): Promise<void> {
    const ids = items.map((i) => i.testId);
    if ((await this.packages.countLiveTests(tenantId, ids)) !== ids.length) {
      throw new BadRequestException({
        message: 'One or more tests do not exist',
        errorCode: 'INVALID_TEST',
      });
    }
  }
}
