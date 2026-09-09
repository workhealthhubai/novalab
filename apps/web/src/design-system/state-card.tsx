import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StateCardProps {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  role?: 'status' | 'alert';
}

/** Shared layout for Empty / Error / Loading states (Figma "StateCard"): 16px radius, centred content. */
export function StateCard({
  icon: Icon,
  iconClassName,
  title,
  description,
  children,
  className,
  role = 'status',
}: StateCardProps) {
  return (
    <div
      role={role}
      className={cn(
        'flex min-h-[300px] flex-col items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-6 py-10 text-center',
        className,
      )}
    >
      <span className={cn('flex size-16 items-center justify-center rounded-full', iconClassName)}>
        <Icon className="size-7" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-md font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-80 text-xs leading-[17px] text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
