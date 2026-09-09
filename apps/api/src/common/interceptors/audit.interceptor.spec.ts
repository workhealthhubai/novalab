import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  HttpCode,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { AuditService } from '@/modules/audit/audit.service';
import { Audit, SkipAudit } from '../decorators/audit.decorator';
import { AuditInterceptor, sanitizeForAudit } from './audit.interceptor';

class EmployeesController {
  create() {}
  @HttpCode(204)
  remove() {}
  @SkipAudit()
  internal() {}
  @Audit({ entityType: 'Report', action: 'EXPORT', idParam: 'employeeId' })
  export() {}
}

function contextFor(
  handler: keyof EmployeesController,
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    getHandler: () => EmployeesController.prototype[handler],
    getClass: () => EmployeesController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const user = { id: 'u1', tenantId: 't1' };

describe('AuditInterceptor', () => {
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
    hasBusinessEntry: jest.fn().mockReturnValue(false),
  };
  const interceptor = new AuditInterceptor(new Reflector(), audit as unknown as AuditService);
  const next = (value: unknown): CallHandler => ({ handle: () => of(value) });

  beforeEach(() => jest.clearAllMocks());

  it('records a sanitised entry for a successful mutation', async () => {
    const request = {
      method: 'POST',
      route: { path: '/api/employees' },
      originalUrl: '/api/employees',
      params: {},
      user,
      body: { firstName: 'A', password: 'x' },
      ip: '1.1.1.1',
      headers: {},
      id: 'req-1',
    };
    const result = await firstValueFrom(
      interceptor.intercept(contextFor('create', request), next({ id: 'e1' })),
    );
    expect(result).toEqual({ id: 'e1' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        userId: 'u1',
        action: 'POST /api/employees',
        entityType: 'Employees',
        entityId: 'e1',
        newValue: { firstName: 'A', password: '[REDACTED]' },
        requestId: 'req-1',
        metadata: expect.objectContaining({ statusCode: 201, outcome: 'SUCCESS', method: 'POST' }),
      }),
    );
  });

  it('honours @Audit overrides and @HttpCode', async () => {
    const request = {
      method: 'DELETE',
      route: { path: '/api/employees/:employeeId' },
      originalUrl: '/api/employees/e9',
      params: { employeeId: 'e9' },
      user,
      body: undefined,
      headers: {},
    };
    await firstValueFrom(interceptor.intercept(contextFor('export', request), next(undefined)));
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EXPORT', entityType: 'Report', entityId: 'e9' }),
    );
    audit.log.mockClear();
    await firstValueFrom(
      interceptor.intercept(
        contextFor('remove', { ...request, params: { id: 'e9' } }),
        next(undefined),
      ),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ statusCode: 204 }) }),
    );
  });

  it('records failures with the error code', async () => {
    const request = {
      method: 'PATCH',
      route: { path: '/api/employees/:id' },
      originalUrl: '/api/employees/e1',
      params: { id: 'e1' },
      user,
      body: {},
      headers: {},
    };
    const failing: CallHandler = {
      handle: () =>
        throwError(() => new BadRequestException({ message: 'bad', errorCode: 'INVALID_COMPANY' })),
    };
    await expect(
      firstValueFrom(interceptor.intercept(contextFor('create', request), failing)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'e1',
        metadata: expect.objectContaining({
          outcome: 'FAILURE',
          statusCode: 400,
          errorCode: 'INVALID_COMPANY',
        }),
      }),
    );
  });

  it('skips GET requests, @SkipAudit handlers, unauthenticated calls and requests already audited by a service', async () => {
    const base = { route: { path: '/x' }, originalUrl: '/x', params: {}, body: {}, headers: {} };
    await firstValueFrom(
      interceptor.intercept(contextFor('create', { ...base, method: 'GET', user }), next(1)),
    );
    await firstValueFrom(
      interceptor.intercept(contextFor('internal', { ...base, method: 'POST', user }), next(1)),
    );
    await firstValueFrom(
      interceptor.intercept(contextFor('create', { ...base, method: 'POST' }), next(1)),
    );
    audit.hasBusinessEntry.mockReturnValueOnce(true);
    await firstValueFrom(
      interceptor.intercept(
        contextFor('create', { ...base, method: 'POST', user, id: 'req-2' }),
        next(1),
      ),
    );
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('sanitizeForAudit redacts secrets, truncates long strings and handles buffers', () => {
    const result = sanitizeForAudit({
      refreshToken: 'abc',
      nested: { Authorization: 'x', ok: 1 },
      long: 'a'.repeat(3000),
      file: Buffer.alloc(10),
    }) as Record<string, unknown>;
    expect(result.refreshToken).toBe('[REDACTED]');
    expect((result.nested as Record<string, unknown>).Authorization).toBe('[REDACTED]');
    expect((result.long as string).endsWith('[truncated]')).toBe(true);
    expect(result.file).toBe('[buffer 10B]');
  });
});
