import { Hourglass } from 'lucide-react';
import { StateCard } from './state-card';

interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingState({ title = 'Yükleniyor…', description, className }: LoadingStateProps) {
  return (
    <StateCard
      icon={Hourglass}
      iconClassName="bg-info-soft text-info"
      title={title}
      description={description}
      className={className}
    >
      <div className="mt-2 flex flex-col items-center gap-2" aria-hidden>
        <span className="h-3 w-[280px] max-w-full animate-pulse rounded-[6px] bg-border/70" />
        <span className="h-3 w-[240px] max-w-full animate-pulse rounded-[6px] bg-border/70" />
        <span className="h-3 w-[260px] max-w-full animate-pulse rounded-[6px] bg-border/70" />
      </div>
    </StateCard>
  );
}
