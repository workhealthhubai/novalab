import { SYSTEM_ROLES } from '@osgb/shared-types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Building,
  Check,
  CheckCheck,
  ChevronDown,
  LogOut,
  Menu,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { findNavLeaf, findNavSection, PATHS } from '@/app/router/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useLogout } from '@/hooks/use-auth';
import { useNotificationMutations, useNotifications } from '@/hooks/use-notifications';
import { initials } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { tenantsService } from '@/services/tenants.service';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/design-system/toast';
import { AppSidebar } from './app-sidebar';

/**
 * Figma "TopBar": 64px, surface background, bottom border, "Section › Page" on the left,
 * utilities on the right. Tenant switching remains intentionally single-tenant per session.
 */
export function AppTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyAccount =
    Boolean(user?.companyId) || Boolean(user?.roles.includes(SYSTEM_ROLES.COMPANY_REPRESENTATIVE));
  const logout = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const currentLeaf = findNavLeaf(location.pathname);
  const currentSection = findNavSection(location.pathname);
  const tenant = useQuery({
    queryKey: ['tenant', 'current'],
    queryFn: () => tenantsService.current(),
    staleTime: 5 * 60_000,
    enabled: !companyAccount,
  });

  const isSwitched = Boolean(
    user?.isSuperAdmin &&
      user?.originalTenantId &&
      user?.tenantId !== user?.originalTenantId,
  );

  const tenantsList = useQuery({
    queryKey: ['tenants', 'switcher-list'],
    queryFn: () => tenantsService.list(1, 100),
    enabled: Boolean(user?.isSuperAdmin),
    staleTime: 60_000,
  });

  const handleSwitchTenant = async (targetTenantId: string) => {
    try {
      const resp = await authService.switchTenant(targetTenantId);
      const remember = useAuthStore.getState().remember;
      useAuthStore.getState().setSession(resp, resp.user, remember);
      queryClient.clear();
      toast.success(
        resp.user.activeTenantName
          ? `"${resp.user.activeTenantName}" kurumuna geçildi`
          : 'Ana kurumunuza dönüldü',
      );
      void navigate(location.pathname);
    } catch (err) {
      toast.error('Kurum geçişi yapılamadı: ' + (err instanceof Error ? err.message : 'Hata oluştu'));
    }
  };

  const notifications = useNotifications(!companyAccount);
  const { markRead, markAllRead } = useNotificationMutations();

  const displayName = user ? `${user.firstName} ${user.lastName}` : '';

  const handleLogout = () => {
    logout.mutate(undefined, { onSettled: () => void navigate(PATHS.login, { replace: true }) });
  };

  return (
    <header className="sticky top-0 z-30 flex h-topbar items-center gap-3 border-b border-topbar-border bg-topbar-background px-4 text-topbar-foreground md:px-6">
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground lg:hidden"
            aria-label="Menüyü aç"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-sidebar p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Navigasyon menüsü</SheetTitle>
          <AppSidebar onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <nav
        aria-label="Sayfa konumu"
        className="flex min-w-0 items-center gap-2 text-base font-semibold"
      >
        <span className="hidden text-muted-foreground sm:inline">
          {currentSection?.label ?? 'OSGB'}
        </span>
        <span className="hidden text-muted-foreground sm:inline" aria-hidden>
          ›
        </span>
        <span className="truncate" aria-current="page">
          {currentLeaf?.label ?? 'Sayfa'}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Impersonation Indicator Pill */}
        {isSwitched ? (
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200 shadow-sm animate-in fade-in">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
            </span>
            <span>
              Yönetilen Kurum: <strong>{tenant.data?.name ?? user?.activeTenantName}</strong>
            </span>
            <button
              type="button"
              onClick={() => void handleSwitchTenant(user!.originalTenantId!)}
              className="ml-1 rounded px-1.5 py-0.5 font-bold underline hover:bg-amber-500/20 cursor-pointer"
              title="Kendi kurumunuza geri dönün"
            >
              Geri Dön
            </button>
          </div>
        ) : null}

        {/* Active tenant badge / Super Admin switcher */}
        {user?.isSuperAdmin ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`hidden h-control-sm items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors md:inline-flex ${
                  isSwitched
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20'
                    : 'border-border bg-card hover:bg-accent text-foreground'
                }`}
                title="OSGB Değiştir (Süper Admin)"
              >
                {isSwitched ? (
                  <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Building className="size-4 text-muted-foreground" aria-hidden />
                )}
                <span className="max-w-40 truncate">
                  {tenant.data?.name ?? user?.activeTenantName ?? 'Kurum'}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2.5 py-1.5">
                <p className="text-xs font-semibold text-foreground">OSGB Değiştir (Süper Admin)</p>
                <p className="text-[11px] text-muted-foreground">Geçiş yapmak istediğiniz kurumu seçin</p>
              </div>
              <DropdownMenuSeparator />
              {isSwitched && user.originalTenantId ? (
                <>
                  <DropdownMenuItem
                    className="font-medium text-amber-700 dark:text-amber-300"
                    onSelect={() => void handleSwitchTenant(user.originalTenantId!)}
                  >
                    <RotateCcw className="size-4 mr-1.5" />
                    Ana Kurumuma Dön
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              {tenantsList.data?.items.map((t) => {
                const isActive = t.id === user?.tenantId;
                return (
                  <DropdownMenuItem
                    key={t.id}
                    className="flex items-center justify-between py-2 cursor-pointer"
                    onSelect={() => {
                      if (!isActive) void handleSwitchTenant(t.id);
                    }}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">slug: {t.slug}</p>
                    </div>
                    {isActive ? <Check className="size-4 text-primary shrink-0" /> : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            className="hidden h-control-sm items-center gap-2 rounded-full border border-border bg-card pr-3 pl-3 text-sm font-medium md:inline-flex"
            title="Aktif kurum"
          >
            <Building className="size-4 text-muted-foreground" aria-hidden />
            <span className="max-w-40 truncate">
              {companyAccount
                ? 'Firma hesabı'
                : (tenant.data?.name ?? (tenant.isPending ? '…' : 'Kurum'))}
            </span>
          </div>
        )}

        {!companyAccount ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
                aria-label="Bildirimler"
              >
                <Bell className="size-5" />
                {(notifications.data?.unreadCount ?? 0) > 0 ? (
                  <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {Math.min(notifications.data!.unreadCount, 9)}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              <div className="flex items-center justify-between px-2.5 py-2">
                <p className="text-sm font-semibold">Bildirimler</p>
                {(notifications.data?.unreadCount ?? 0) > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={markAllRead.isPending}
                    onClick={() => markAllRead.mutate()}
                  >
                    <CheckCheck className="size-3.5" />
                    Tümünü oku
                  </Button>
                ) : null}
              </div>
              <DropdownMenuSeparator />
              {notifications.isPending ? (
                <p className="px-2.5 py-4 text-sm text-muted-foreground">Yükleniyor…</p>
              ) : null}
              {notifications.error ? (
                <p className="px-2.5 py-4 text-sm text-destructive">Bildirimler alınamadı.</p>
              ) : null}
              {notifications.data?.items.length === 0 ? (
                <p className="px-2.5 py-4 text-sm text-muted-foreground">Yeni bildirim yok.</p>
              ) : null}
              {notifications.data?.items.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={
                    notification.readAt
                      ? 'items-start py-2.5'
                      : 'items-start bg-primary-soft/40 py-2.5'
                  }
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!notification.readAt) markRead.mutate(notification.id);
                  }}
                >
                  <Bell className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{notification.title}</span>
                    <span className="mt-0.5 block whitespace-normal text-xs text-muted-foreground">
                      {notification.body}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-dark outline-none transition-colors hover:bg-primary-soft/70 focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label="Kullanıcı menüsü"
            >
              {initials(displayName || '?')}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2.5 py-2">
              <p className="truncate text-base font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              {user?.roles.length ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {user.roles.join(', ')}
                </p>
              ) : null}
            </div>
            <DropdownMenuSeparator />
            {!companyAccount ? (
              <DropdownMenuItem onSelect={() => void navigate(PATHS.organization)}>
                <UserRound />
                Profil
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleLogout}
              disabled={logout.isPending}
            >
              <LogOut />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
