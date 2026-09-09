import { type ReactNode, useEffect, useState } from 'react';
import { LoadingState } from '@/design-system/loading-state';
import { refreshAccessToken } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Re-establishes the session after a page load: exchanges the persisted refresh token for an
 * access token and reloads the principal (roles/permissions) so changes apply immediately.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { refreshToken, clearSession, setUser } = useAuthStore.getState();
      if (!refreshToken) {
        clearSession();
      } else if (await refreshAccessToken()) {
        try {
          setUser(await authService.me());
        } catch {
          clearSession();
        }
      }
      if (!cancelled) setReady(true);
    })().catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <LoadingState title="Oturum geri yükleniyor…" className="w-full max-w-[420px]" />
      </div>
    );
  }
  return <>{children}</>;
}
