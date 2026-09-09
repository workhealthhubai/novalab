import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Figma "StatusBadge": soft background, coloured 6px dot, 12px medium label. */
const statusBadgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap [&>[data-dot]]:size-1.5 [&>[data-dot]]:rounded-full',
  {
    variants: {
      status: {
        completed:
          'bg-status-completed-soft text-status-completed [&>[data-dot]]:bg-status-completed',
        waiting: 'bg-status-waiting-soft text-status-waiting [&>[data-dot]]:bg-status-waiting',
        processing:
          'bg-status-processing-soft text-status-processing [&>[data-dot]]:bg-status-processing',
        signed: 'bg-status-signed-soft text-status-signed [&>[data-dot]]:bg-status-signed',
        cancelled:
          'bg-status-cancelled-soft text-status-cancelled [&>[data-dot]]:bg-status-cancelled',
      },
    },
    defaultVariants: { status: 'completed' },
  },
);

export type Status = NonNullable<VariantProps<typeof statusBadgeVariants>['status']>;

export const STATUS_LABELS: Record<Status, string> = {
  completed: 'Tamamlandı',
  waiting: 'Beklemede',
  processing: 'İşlemde',
  signed: 'E-İmzalı',
  cancelled: 'İptal',
};

interface StatusBadgeProps extends Omit<ComponentProps<'span'>, 'children'> {
  status: Status;
  /** Overrides the default Turkish label. */
  label?: string;
}

export function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      <span data-dot aria-hidden />
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
