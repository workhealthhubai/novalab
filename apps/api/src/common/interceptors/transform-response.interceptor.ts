import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessResponse, PaginatedResult } from '@osgb/shared-types';
import { getRequestId, type RequestWithUser } from '../interfaces/request-with-user.interface';

function isPaginated(value: unknown): value is PaginatedResult<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PaginatedResult<unknown>).items) &&
    typeof (value as PaginatedResult<unknown>).meta === 'object'
  );
}

/**
 * Wraps controller return values into the standard success envelope:
 *   { success: true, data, meta?, requestId }
 * Streams (StreamableFile) are passed through untouched.
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<unknown> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<unknown> | T> {
    const requestId = getRequestId(context.switchToHttp().getRequest<RequestWithUser>());
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile) return data as T;
        if (isPaginated(data)) {
          return { success: true as const, data: data.items, meta: data.meta, requestId };
        }
        return { success: true as const, data, requestId };
      }),
    );
  }
}
