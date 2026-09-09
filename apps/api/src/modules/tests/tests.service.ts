import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { TestDefinition } from '@/generated/prisma/client';
import { AuditService } from '@/modules/audit/audit.service';
import type { CreateTestDto } from './dto/create-test.dto';
import type { TestQueryDto } from './dto/test-query.dto';
import type { UpdateTestDto } from './dto/update-test.dto';
import { normalizeTestCode } from './test-code';
import { TestsRepository } from './tests.repository';

function snapshot(t: TestDefinition) {
  return {
    code: t.code,
    name: t.name,
    category: t.category,
    unitPrice: t.unitPrice.toString(),
    vatRate: t.vatRate,
    isActive: t.isActive,
  };
}

@Injectable()
export class TestsService {
  constructor(
    private readonly tests: TestsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: TestQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.tests.findMany(tenantId, skip, take, {
      search: query.search,
      category: query.category,
      isActive: query.isActive,
    });
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string): Promise<TestDefinition> {
    const test = await this.tests.findById(tenantId, id);
    if (!test)
      throw new NotFoundException({ message: 'Test not found', errorCode: 'TEST_NOT_FOUND' });
    return test;
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateTestDto,
    ctx: RequestContext,
  ): Promise<TestDefinition> {
    const code = normalizeTestCode(dto.code);
    await this.assertCodeFree(tenantId, code);
    const test = await this.tests.create(tenantId, { ...dto, code });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'TestDefinition',
      entityId: test.id,
      newValue: snapshot(test),
      ...ctx,
    });
    return test;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateTestDto,
    ctx: RequestContext,
  ): Promise<TestDefinition> {
    const before = await this.get(tenantId, id);
    const code = dto.code !== undefined ? normalizeTestCode(dto.code) : undefined;
    if (code !== undefined && code !== before.code) await this.assertCodeFree(tenantId, code, id);
    const data = Object.fromEntries(
      Object.entries({ ...dto, code }).filter(([, v]) => v !== undefined),
    );
    await this.tests.update(tenantId, id, data);
    const after = await this.get(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'TestDefinition',
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
    await this.tests.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'TestDefinition',
      entityId: id,
      oldValue: snapshot(before),
      ...ctx,
    });
  }

  private async assertCodeFree(tenantId: string, code: string, exceptId?: string): Promise<void> {
    const taken = await this.tests.findByCode(tenantId, code, exceptId);
    if (taken)
      throw new ConflictException({
        message: `Code ${code} is already used by ${taken.name}`,
        errorCode: 'DUPLICATE_TEST_CODE',
      });
  }
}
