import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { adminUser, loginResponse } from '@/test/auth-fixtures';
import { apiClient, ApiError, refreshClient } from './api-client';

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  const response = {
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
  } as AxiosResponse;
  if (status >= 400) {
    const error = Object.assign(new Error(`Request failed with status code ${status}`), {
      isAxiosError: true,
      config,
      response,
      toJSON: () => ({}),
    });
    throw error;
  }
  return response;
}

describe('apiClient token refresh', () => {
  const apiCalls: Array<{ url: string; auth?: string }> = [];
  const refreshCalls: string[] = [];

  beforeEach(() => {
    apiCalls.length = 0;
    refreshCalls.length = 0;
    useAuthStore.getState().setSession(loginResponse(), adminUser, false);

    const apiAdapter: AxiosAdapter = async (config) => {
      const auth = config.headers.Authorization as string | undefined;
      apiCalls.push({ url: config.url ?? '', auth });
      if (auth === 'Bearer access-token' || config.url?.startsWith('/auth/')) {
        return respond(config, 401, {
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'expired' },
        });
      }
      return respond(config, 200, { success: true, data: { ok: true } });
    };
    const refreshAdapter: AxiosAdapter = async (config) => {
      refreshCalls.push(String((config.data as string | undefined) ?? ''));
      return respond(config, 200, {
        success: true,
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresIn: 900,
          tokenType: 'Bearer',
        },
      });
    };
    apiClient.defaults.adapter = apiAdapter;
    refreshClient.defaults.adapter = refreshAdapter;
  });

  it('refreshes once on 401, retries with the new token and rotates the stored tokens', async () => {
    const response = await apiClient.get<{ data: { ok: boolean } }>('/employees');
    expect(response.data.data.ok).toBe(true);
    expect(apiCalls.map((c) => c.auth)).toEqual(['Bearer access-token', 'Bearer new-access']);
    expect(refreshCalls).toHaveLength(1);
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh');
  });

  it('shares a single refresh between concurrent 401s', async () => {
    await Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')]);
    expect(refreshCalls).toHaveLength(1);
    expect(apiCalls.filter((c) => c.auth === 'Bearer new-access')).toHaveLength(3);
  });

  it('clears the session and does not loop when the refresh itself fails', async () => {
    refreshClient.defaults.adapter = async (config) =>
      respond(config, 401, {
        success: false,
        error: { code: 'REFRESH_TOKEN_REUSED', message: 'reuse' },
      });
    await expect(apiClient.get('/employees')).rejects.toBeInstanceOf(ApiError);
    expect(apiCalls).toHaveLength(1);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('never tries to refresh for auth endpoints (skipAuth)', async () => {
    await expect(apiClient.post('/auth/login', {}, { skipAuth: true })).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
    expect(refreshCalls).toHaveLength(0);
  });
});
