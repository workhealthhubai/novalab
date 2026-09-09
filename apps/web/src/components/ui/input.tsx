import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Text input matching the Figma "Input Field" frame (10px radius, 12px horizontal padding). */
function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-input w-full min-w-0 rounded-md border border-input bg-card px-3 text-base text-foreground transition-colors',
        'placeholder:text-muted-foreground',
        'hover:border-slate-300 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
        'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
