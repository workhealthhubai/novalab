import { ClipboardList } from 'lucide-react';
import type { ReactNode } from 'react';
import { StateCard } from './state-card';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call to action (an AppButton). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <StateCard
      icon={ClipboardList}
      iconClassName="bg-muted text-muted-foreground"
      title={title}
      description={description}
      className={className}
    >
      {action ? <div className="mt-1">{action}</div> : null}
    </StateCard>
  );
}
