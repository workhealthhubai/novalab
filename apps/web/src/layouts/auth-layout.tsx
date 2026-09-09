import { Plus } from 'lucide-react';
import { Navigate, Outlet } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { useAuth } from '@/hooks/use-auth';

/** Public shell for /login: canvas background, centred card, product mark above. */
export function AuthLayout() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to={PATHS.dashboard} replace />;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-[9px] bg-primary text-primary-foreground">
          <Plus className="size-4" strokeWidth={3} aria-hidden />
        </span>
        <span className="flex flex-col">
          <span className="text-lg leading-5 font-bold text-foreground">OSGB Suite</span>
          <span className="text-[10.5px] leading-3.5 font-medium text-primary-dark">
            İş Sağlığı ve Güvenliği Platformu
          </span>
        </span>
      </div>
      <main className="w-full max-w-[400px] rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <Outlet />
      </main>
      <p className="mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} OSGB Suite</p>
    </div>
  );
}
