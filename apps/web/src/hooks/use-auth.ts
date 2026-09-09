import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { authService, type LoginPayload } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      user: s.user,
      status: s.status,
      isAuthenticated: s.status === 'authenticated' && s.user !== null,
    })),
  );
}

/**
 * SPA logins never navigate, so browsers may not offer to save the password. The Credential
 * Management API (Chromium) asks explicitly; other browsers ignore it and rely on the form's
 * autocomplete attributes.
 */
interface PasswordCredentialCtor {
  new (data: { id: string; password: string; name?: string }): Credential;
}

function offerCredentialSave(email: string, password: string, name: string): void {
  const ctor = (globalThis as { PasswordCredential?: PasswordCredentialCtor }).PasswordCredential;
  if (!ctor || !navigator.credentials) return;
  try {
    void navigator.credentials
      .store(new ctor({ id: email, password, name }))
      .catch(() => undefined);
  } catch {
    // unsupported shape — ignore
  }
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ remember, ...payload }: LoginPayload & { remember: boolean }) =>
      authService.login(payload).then((response) => ({ response, remember })),
    onSuccess: ({ response, remember }, { email, password }) => {
      const { user, ...tokens } = response;
      setSession(tokens, user, remember);
      offerCredentialSave(email, password, `${user.firstName} ${user.lastName}`);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { refreshToken } = useAuthStore.getState();
      if (refreshToken) await authService.logout(refreshToken).catch(() => undefined);
    },
    onSettled: () => {
      useAuthStore.getState().clearSession();
      queryClient.clear();
    },
  });
}
