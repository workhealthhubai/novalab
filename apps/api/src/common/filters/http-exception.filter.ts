import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import type { ApiErrorResponse } from '@osgb/shared-types';
import { Prisma } from '@/generated/prisma/client';
import { getRequestId, type RequestWithUser } from '../interfaces/request-with-user.interface';
import { safeRequestPath } from '../utils/safe-request-path';

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

/** Friendlier messages for unique constraints users hit through forms. */
const UNIQUE_MESSAGES: Array<{ field: string; code: string; message: string }> = [
  {
    field: 'nationalId',
    code: 'DUPLICATE_NATIONAL_ID',
    message: 'Bu TC Kimlik No ile kayıtlı bir hasta zaten var',
  },
  {
    field: 'registrationNumber',
    code: 'DUPLICATE_REGISTRATION_NUMBER',
    message: 'Bu Sicil No zaten kullanılıyor',
  },
  { field: 'email', code: 'DUPLICATE_EMAIL', message: 'Bu e-posta adresi zaten kayıtlı' },
];

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Centralized exception handling. Every error leaves the API in the same envelope:
 * { success: false, error: { code, message, details? }, requestId, timestamp, path }
 * Internal details (stack traces, Prisma internals) are logged but never returned.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser & Request>();
    const requestId = getRequestId(request);

    const normalized = this.normalize(exception);
    const path = safeRequestPath(
      (request.route as { path?: string } | undefined)?.path ?? request.originalUrl,
    );
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details !== undefined ? { details: normalized.details } : {}),
      },
      requestId,
      timestamp: new Date().toISOString(),
      path,
    };

    const logPayload = {
      requestId,
      method: request.method,
      path,
      status: normalized.status,
      code: normalized.code,
      userId: request.user?.id,
      tenantId: request.user?.tenantId,
    };
    if (normalized.status >= 500) {
      this.logger.error({ ...logPayload, err: exception }, 'Unhandled exception');
    } else {
      this.logger.warn(logPayload, normalized.message);
    }

    response.status(normalized.status).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Invalid data for the requested operation',
      };
    }
    if (isPayloadTooLarge(exception)) {
      return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
    }
    return { status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' };
  }

  private fromHttpException(exception: HttpException): NormalizedError {
    const status = exception.getStatus();
    const raw = exception.getResponse();
    const fallbackCode = STATUS_CODE_MAP[status] ?? 'ERROR';

    if (typeof raw === 'string') {
      return { status, code: fallbackCode, message: raw };
    }

    const payload = raw as {
      message?: string | string[];
      error?: string;
      errorCode?: string;
      details?: unknown;
    };

    // class-validator errors arrive as an array of messages.
    if (Array.isArray(payload.message)) {
      return {
        status,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: payload.message,
      };
    }

    return {
      status,
      code: payload.errorCode ?? fallbackCode,
      message: payload.message ?? exception.message,
      ...(payload.details !== undefined ? { details: payload.details } : {}),
    };
  }

  private fromPrismaError(error: Prisma.PrismaClientKnownRequestError): NormalizedError {
    switch (error.code) {
      case 'P2002': {
        // Prisma 7 driver adapters report the violated constraint name instead of `target` fields.
        const meta = error.meta as
          | {
              target?: unknown;
              driverAdapterError?: {
                cause?: { constraint?: { index?: string; fields?: string[] } };
              };
            }
          | undefined;
        const constraint = meta?.driverAdapterError?.cause?.constraint;
        const fields = Array.isArray(meta?.target)
          ? (meta.target as string[])
          : (constraint?.fields ?? (constraint?.index ? [constraint.index] : []));
        const known = UNIQUE_MESSAGES.find(({ field }) =>
          fields.some((name) => name.includes(field)),
        );
        return {
          status: HttpStatus.CONFLICT,
          code: known?.code ?? 'CONFLICT',
          message: known?.message ?? 'A record with the same unique value already exists',
          details: { fields },
        };
      }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND', message: 'Record not found' };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Referenced record does not exist',
        };
      default:
        return { status: 500, code: 'DATABASE_ERROR', message: 'A database error occurred' };
    }
  }
}

function isPayloadTooLarge(exception: unknown): boolean {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as { type?: string }).type === 'entity.too.large'
  );
}
