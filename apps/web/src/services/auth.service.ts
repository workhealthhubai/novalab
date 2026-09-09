import type { AuthUser, LoginRequest, LoginResponse, TokenPair } from '@osgb/shared-types';
import { apiClient, unwrap } from './api-client';

export interface LoginPayload extends LoginRequest {
  tenantSlug?: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    return unwrap(await apiClient.post('/auth/login', payload, { skipAuth: true }));
  },
  async refresh(refreshToken: string): Promise<TokenPair> {
    return unwrap(await apiClient.post('/auth/refresh', { refreshToken }, { skipAuth: true }));
  },
  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken }, { skipAuth: true });
  },
  async me(): Promise<AuthUser> {
    return unwrap(await apiClient.get('/auth/me'));
  },
};
