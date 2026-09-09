import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsActivePath } from '@/lib/use-active-path';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Renders indented under a section header. */
  nested?: boolean;
  /** Icon-only rail rendering with a tooltip. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Sidebar link matching the Figma "NavItem": 40px high, 10px radius, 20px icon, 14px label.
 * Active: soft brand background, dark brand text and a 3.5px brand bar on the left edge.
 *
 * The active state is computed here (not via NavLink's className callback) because Radix `Slot`
 * (Tooltip/DropdownMenu `asChild`) can only merge string classNames.
 */
export function NavItem({
  to,
  label,
  icon: Icon,
  nested = false,
  collapsed = false,
  onNavigate,
}: NavItemProps) {
  const isActive = useIsActivePath(to);

  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      aria-label={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-md text-base font-medium transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0',
        collapsed
          ? 'h-nav-item justify-center px-0'
          : nested
            ? 'h-9 pr-3 pl-9 text-sm'
            : 'h-nav-item pr-3 pl-2.5',
        isActive
          ? 'bg-sidebar-active font-semibold text-sidebar-active-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground',
      )}
    >
      {isActive ? (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-5 w-[3.5px] -translate-y-1/2 rounded-[2px] bg-primary"
        />
      ) : null}
      <Icon
        aria-hidden
        className={cn(
          'shrink-0',
          nested && !collapsed ? 'size-4' : 'size-5',
          isActive ? 'text-primary-dark' : 'text-sidebar-foreground/75 group-hover:text-foreground',
        )}
        strokeWidth={1.75}
      />
      {collapsed ? null : <span className="truncate">{label}</span>}
    </NavLink>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
