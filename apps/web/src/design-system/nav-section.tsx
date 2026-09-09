import { ChevronDown } from 'lucide-react';
import { Collapsible } from 'radix-ui';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { NavSection as NavSectionConfig } from '@/types/navigation';
import { NavItem } from './nav-item';

interface NavSectionProps {
  section: NavSectionConfig;
  collapsed?: boolean;
  onNavigate?: () => void;
}

const headerClass =
  'group flex h-nav-item w-full items-center gap-3 rounded-md text-base font-medium transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0';

/**
 * Expandable sidebar group. The section containing the current route opens automatically.
 * In the collapsed rail the header becomes an icon button that opens a right-side menu of children.
 */
export function NavSection({ section, collapsed = false, onNavigate }: NavSectionProps) {
  const { pathname } = useLocation();
  const containsActive =
    pathname === section.basePath || pathname.startsWith(`${section.basePath}/`);
  const [open, setOpen] = useState(containsActive);
  // Re-open when navigation lands inside this section (state adjustment during render, no effect).
  const [wasActive, setWasActive] = useState(containsActive);
  if (containsActive !== wasActive) {
    setWasActive(containsActive);
    if (containsActive) setOpen(true);
  }
  const Icon = section.icon;

  if (collapsed) {
    return (
      <DropdownMenu modal={false}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={section.label}
                className={cn(
                  headerClass,
                  'justify-center px-0',
                  containsActive
                    ? 'bg-sidebar-active text-sidebar-active-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground',
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    'size-5',
                    containsActive
                      ? 'text-primary-dark'
                      : 'text-sidebar-foreground/75 group-hover:text-foreground',
                  )}
                  strokeWidth={1.75}
                />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{section.label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" sideOffset={10} className="w-60">
          <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
          {section.children.map((child) => {
            const isActive = pathname === child.path || pathname.startsWith(`${child.path}/`);
            return (
              <DropdownMenuItem key={child.path} asChild onSelect={onNavigate}>
                {/* Slot merges string classNames only, so the active class is computed here, not via NavLink's callback. */}
                <NavLink
                  to={child.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    isActive &&
                      'bg-sidebar-active font-semibold text-sidebar-active-foreground [&_svg]:text-primary-dark',
                  )}
                >
                  <child.icon />
                  {child.label}
                </NavLink>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger
        className={cn(
          headerClass,
          'pr-2.5 pl-2.5',
          containsActive
            ? 'text-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground',
        )}
        aria-label={`${section.label} bölümünü ${open ? 'daralt' : 'genişlet'}`}
      >
        <Icon
          aria-hidden
          className={cn(
            'size-5 shrink-0',
            containsActive
              ? 'text-primary-dark'
              : 'text-sidebar-foreground/75 group-hover:text-foreground',
          )}
          strokeWidth={1.75}
        />
        <span className={cn('flex-1 truncate text-left', containsActive && 'font-semibold')}>
          {section.label}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-sidebar-foreground/60 transition-transform',
            open && 'rotate-180',
          )}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="flex flex-col gap-[2px] pt-[2px]">
        {section.children.map((child) => (
          <NavItem
            key={child.path}
            to={child.path}
            label={child.label}
            icon={child.icon}
            nested
            onNavigate={onNavigate}
          />
        ))}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
