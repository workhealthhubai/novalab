/** Envelope returned by every successful API call. */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
  requestId?: string;
}

export interface ApiErrorBody {
  /** Machine readable error code, e.g. VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND. */
  code: string;
  /** Human readable message safe to show to end users. */
  message: string;
  /** Optional structured details (e.g. validation errors per field). */
  details?: unknown;
}

/** Envelope returned by every failed API call. */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  requestId?: string;
  timestamp: string;
  path?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}
