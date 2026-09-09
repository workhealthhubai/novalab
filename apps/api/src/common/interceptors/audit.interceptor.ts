import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '@/modules/audit/audit.service';
import { AUDIT_KEY, type AuditOptions } from '../decorators/audit.decorator';
import {
  extractRequestContext,
  type RequestWithUser,
} from '../interfaces/request-with-user.interface';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'apikey',
]);
const MAX_STRING = 2_000;
const MAX_BODY_JSON = 20_000;

/** Removes secrets and shrinks large payloads before they are persisted in the audit trail. */
export function sanitizeForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string')
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  if (typeof value !== 'object') return value;
  if (Buffer.isBuffer(value)) return `[buffer ${value.length}B]`;
  if (depth > 6) return '[depth]';
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => sanitizeForAudit(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? '[REDACTED]'
      : sanitizeForAudit(item, depth + 1);
  }
  return result;
}

function boundedBody(body: unknown): unknown {
  const sanitized = sanitizeForAudit(body);
  if (sanitized === undefined || sanitized === null) return undefined;
  try {
    return JSON.stringify(sanitized).length > MAX_BODY_JSON ? { _truncated: true } : sanitized;
  } catch {
    return { _unserializable: true };
  }
}

function extractEntityId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const id = (body as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

function deriveEntityType(controllerName: string): string {
  return controllerName.replace(/Controller$/, '') || 'Unknown';
}

/**
 * Automatically audits every authenticated mutating request (POST/PUT/PATCH/DELETE):
 * who did what, on which entity, with which (sanitised) payload, and the outcome.
 * Services that write richer entries (old/new values) take precedence — when one exists
 * for the same request no generic row is added. Use @SkipAudit()/@Audit() to tune per route.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const method = request.method.toUpperCase();
    const user = request.user;
    const options =
      this.reflector.getAllAndOverride<AuditOptions | undefined>(AUDIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? {};

    // Unauthenticated calls have no tenant to attribute to; they are covered by the access log.
    if (!MUTATING_METHODS.has(method) || options.skip || !user) return next.handle();

    const startedAt = Date.now();
    const ctx = extractRequestContext(request);
    const routePath = (request.route as { path?: string } | undefined)?.path ?? request.path;
    const params = request.params as Record<string, string | undefined>;
    const entityIdFromParams = params[options.idParam ?? 'id'] ?? null;
    const base = {
      tenantId: user.tenantId,
      userId: user.id,
      action: options.action ?? `${method} ${routePath}`,
      entityType: options.entityType ?? deriveEntityType(context.getClass().name),
      ...ctx,
    };
    const successStatus =
      this.reflector.get<number | undefined>(HTTP_CODE_METADATA, context.getHandler()) ??
      (method === 'POST' ? 201 : 200);

    return next.handle().pipe(
      tap({
        next: (body: unknown) => {
          if (this.audit.hasBusinessEntry(ctx.requestId)) return;
          void this.audit.log({
            ...base,
            entityId:
              entityIdFromParams ?? (body instanceof StreamableFile ? null : extractEntityId(body)),
            newValue: boundedBody(request.body),
            metadata: {
              method,
              path: request.originalUrl,
              statusCode: successStatus,
              durationMs: Date.now() - startedAt,
              outcome: 'SUCCESS',
            },
          });
        },
        error: (error: unknown) => {
          const statusCode = error instanceof HttpException ? error.getStatus() : 500;
          const response = error instanceof HttpException ? error.getResponse() : undefined;
          const payload =
            typeof response === 'object' && response !== null
              ? (response as { errorCode?: string; message?: unknown })
              : undefined;
          // class-validator failures arrive as an array of messages without an errorCode.
          const errorCode =
            payload?.errorCode ??
            (Array.isArray(payload?.message) ? 'VALIDATION_ERROR' : undefined);
          void this.audit.log({
            ...base,
            entityId: entityIdFromParams,
            newValue: boundedBody(request.body),
            metadata: {
              method,
              path: request.originalUrl,
              statusCode,
              durationMs: Date.now() - startedAt,
              outcome: 'FAILURE',
              errorCode: errorCode ?? (error instanceof Error ? error.name : 'Error'),
            },
          });
        },
      }),
    );
  }
}
