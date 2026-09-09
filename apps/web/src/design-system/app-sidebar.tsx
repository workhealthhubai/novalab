import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { NAV_TREE, PATHS } from '@/app/router/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { cn, initials } from '@/lib/utils';
import { isNavSection, type NavEntry } from '@/types/navigation';
import { NavItem } from './nav-item';
import { NavSection } from './nav-section';

interface AppSidebarProps {
  /** Icon-only rail (desktop). The mobile drawer always renders expanded. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Called after a navigation link is clicked (closes the mobile drawer). */
  onNavigate?: () => void;
  className?: string;
}

/**
 * Figma "Sidebar": surface background, brand mark + product name, NavItems, user card at the bottom.
 * Sections expand/collapse; the whole sidebar can shrink to a 64px icon rail. Entries the user has
 * no permission for are hidden (the API and PermissionGate remain the authority).
 */
export function AppSidebar({
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
  className,
}: AppSidebarProps) {
  const { user } = useAuth();
  const { can } = usePermissions();

  const visibleEntries = NAV_TREE.flatMap((entry): NavEntry[] => {
    if (!isNavSection(entry)) return !entry.permission || can(entry.permission) ? [entry] : [];
    const children = entry.children.filter((child) => !child.permission || can(child.permission));
    return children.length > 0 ? [{ ...entry, children }] : [];
  });

  const displayName = user ? `${user.firstName} ${user.lastName}` : '';
  const roleLabel = user?.roles.join(', ') ?? '';

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-sidebar-background pt-4 pb-3.5',
        collapsed ? 'w-16 px-2.5' : 'w-sidebar px-3.5',
        className,
      )}
    >
      <Link
        to={PATHS.dashboard}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2.5 rounded-md pb-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          collapsed ? 'justify-center' : 'pl-1.5',
        )}
        aria-label="OSGB Suite ana sayfa"
      >
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-primary text-primary-foreground">
          <Plus className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
        {collapsed ? null : (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-lg leading-5 font-bold text-foreground">OSGB Suite</span>
            <span className="truncate text-[10.5px] leading-3.5 font-medium text-primary-dark">
              İş Sağlığı ve Güvenliği
            </span>
          </span>
        )}
      </Link>

      <nav
        aria-label="Ana navigasyon"
        className={cn(
          'mt-3 flex flex-1 flex-col gap-[3px] overflow-x-hidden overflow-y-auto',
          // Expanded: thin hover-only scrollbar with a reserved gutter so text never shifts.
          // Collapsed rail: no gutter at all, otherwise the 64px rail gets an empty strip on the right
          // and the icons sit off-centre; the rail still scrolls with the wheel.
          collapsed ? 'scrollbar-none' : 'scrollbar-subtle -mr-1.5 pr-1.5',
        )}
      >
        {visibleEntries.map((entry) =>
          isNavSection(entry) ? (
            <NavSection
              key={entry.id}
              section={entry}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ) : (
            <NavItem
              key={entry.path}
              to={entry.path}
              label={entry.label}
              icon={entry.icon}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ),
        )}
      </nav>

      {onToggleCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
              aria-expanded={!collapsed}
              className={cn(
                'mt-2 flex h-9 items-center gap-3 rounded-md text-sm font-medium text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
                collapsed ? 'justify-center' : 'px-2.5',
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-5" strokeWidth={1.75} aria-hidden />
              ) : (
                <PanelLeftClose className="size-5" strokeWidth={1.75} aria-hidden />
              )}
              {collapsed ? null : <span>Menüyü daralt</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
          </TooltipContent>
        </Tooltip>
      ) : null}

      <div
        className={cn(
          'mt-2 flex items-center gap-2.5 rounded-lg bg-muted',
          collapsed ? 'justify-center p-1.5' : 'px-2.5 py-2',
        )}
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11.5px] font-semibold text-primary-dark"
          title={collapsed ? `${displayName} · ${roleLabel}` : undefined}
        >
          {initials(displayName || '?')}
        </span>
        {collapsed ? null : (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm leading-[17px] font-semibold text-foreground">
              {displayName}
            </span>
            <span className="truncate text-[10.5px] leading-3.5 text-muted-foreground">
              {roleLabel}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
