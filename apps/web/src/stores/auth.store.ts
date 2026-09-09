import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { AuthUser, TokenPair } from '@osgb/shared-types';

export type SessionStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  /** Kept in memory only — never persisted. */
  accessToken: string | null;
  /** Persisted (localStorage when "remember me", otherwise sessionStorage); rotated on every refresh. */
  refreshToken: string | null;
  remember: boolean;
  user: AuthUser | null;
  status: SessionStatus;
  setSession: (tokens: TokenPair, user: AuthUser, remember: boolean) => void;
  setTokens: (tokens: TokenPair) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
}

const STORAGE_KEY = 'osgb.auth';

/**
 * Writes to localStorage when the user chose "remember me", otherwise to sessionStorage.
 * Reads whichever holds a value so a persisted session survives reloads in both cases.
 */
const sessionAwareStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name) ?? window.sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      const remember =
        (JSON.parse(value) as { state?: { remember?: boolean } }).state?.remember === true;
      const target = remember ? window.localStorage : window.sessionStorage;
      const other = remember ? window.sessionStorage : window.localStorage;
      target.setItem(name, value);
      other.removeItem(name);
    } catch {
      /* storage unavailable */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
      window.sessionStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      remember: false,
      user: null,
      status: 'unknown',
      setSession: (tokens, user, remember) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
          remember,
          status: 'authenticated',
        }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user, status: 'authenticated' }),
      clearSession: () =>
        set({ accessToken: null, refreshToken: null, user: null, status: 'unauthenticated' }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionAwareStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
        remember: state.remember,
      }),
    },
  ),
);
