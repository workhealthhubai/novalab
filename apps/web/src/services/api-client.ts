import axios, { type AxiosError, type AxiosResponse } from 'axios';
import type { ApiErrorResponse, ApiSuccessResponse, TokenPair } from '@osgb/shared-types';
import { env } from '@/lib/env';
import { useAuthStore } from '@/stores/auth.store';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Skip attaching the access token and the 401 refresh flow (auth endpoints). */
    skipAuth?: boolean;
    /** Internal: marks a request that was already retried after a refresh. */
    _retried?: boolean;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Converts any axios/network failure into a typed ApiError. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as Partial<ApiErrorResponse> | undefined;
    if (body?.error) {
      return new ApiError(
        body.error.message,
        body.error.code,
        error.response?.status,
        body.error.details,
        body.requestId,
      );
    }
    if (error.code === 'ERR_NETWORK')
      return new ApiError('Sunucuya ulaşılamıyor.', 'NETWORK_ERROR');
    return new ApiError(error.message, 'HTTP_ERROR', error.response?.status);
  }
  return new ApiError(error instanceof Error ? error.message : 'Bilinmeyen hata', 'UNKNOWN');
}

/** Unwraps the `{ success, data, meta }` envelope. */
export function unwrap<T>(response: AxiosResponse<ApiSuccessResponse<T>>): T {
  return response.data.data;
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

/** Plain client without interceptors, used for the refresh call itself. Exported for tests. */
export const refreshClient = axios.create({ baseURL: env.apiBaseUrl, timeout: 15_000 });

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Single-flight token refresh: concurrent 401s share one refresh request.
 * Returns the new access token, or null (and clears the session) on failure.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const { refreshToken, setTokens, clearSession } = useAuthStore.getState();
      if (!refreshToken) {
        clearSession();
        return null;
      }
      try {
        const response = await refreshClient.post<ApiSuccessResponse<TokenPair>>('/auth/refresh', {
          refreshToken,
        });
        const tokens = unwrap(response);
        setTokens(tokens);
        return tokens.accessToken;
      } catch {
        clearSession();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

apiClient.interceptors.request.use((config) => {
  if (!config.skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;
    const status = error.response?.status;

    // One refresh attempt per request, never for auth endpoints -> no infinite loops.
    if (status === 401 && config && !config._retried && !config.skipAuth) {
      config._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
        return apiClient(config);
      }
    }
    return Promise.reject(toApiError(error));
  },
);
