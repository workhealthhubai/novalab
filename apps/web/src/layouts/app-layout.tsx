import { Navigate, Outlet, useLocation } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { AppSidebar } from '@/design-system/app-sidebar';
import { AppTopbar } from '@/design-system/app-topbar';
import { useAuth } from '@/hooks/use-auth';
import { setSidebarCollapsed, useSidebarCollapsed } from '@/lib/sidebar-state';
import { cn } from '@/lib/utils';

/**
 * Authenticated shell: fixed sidebar on desktop (256px, or a 64px icon rail when collapsed;
 * a drawer below `lg`), sticky 64px topbar, scrollable content area.
 */
export function AppLayout() {
  const { isAuthenticated: authenticated } = useAuth();
  const collapsed = useSidebarCollapsed();
  const location = useLocation();

  if (!authenticated) {
    return <Navigate to={PATHS.login} replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border transition-[width] duration-200 lg:block',
          collapsed ? 'w-16' : 'w-sidebar',
        )}
      >
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!collapsed)}
        />
      </aside>
      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[padding] duration-200',
          collapsed ? 'lg:pl-16' : 'lg:pl-sidebar',
        )}
      >
        <AppTopbar />
        <main id="main-content" className="flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
