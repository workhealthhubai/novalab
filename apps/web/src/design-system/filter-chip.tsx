import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

interface FilterChipProps extends Omit<ComponentProps<'button'>, 'children'> {
  label: string;
  /** Figma "Aktif=Evet": brand fill; otherwise surface with border. */
  active?: boolean;
}

/** Toggle chip for list filters (999px radius, 13px medium). */
export function FilterChip({ label, active = false, className, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-slot="filter-chip"
      className={cn(
        'inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors select-none',
        active
          ? 'border-primary bg-primary text-primary-foreground hover:bg-primary-hover'
          : 'border-border bg-card text-muted-foreground hover:border-slate-300 hover:text-foreground',
        className,
      )}
      {...props}
    >
      {label}
    </button>
  );
}
