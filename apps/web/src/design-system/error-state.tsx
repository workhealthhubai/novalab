import { RotateCw, Zap } from 'lucide-react';
import { AppButton } from './app-button';
import { StateCard } from './state-card';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Veriler yüklenemedi',
  description = 'Sunucuyla bağlantı kurulamadı. Ağ bağlantınızı kontrol edip tekrar deneyin.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <StateCard
      role="alert"
      icon={Zap}
      iconClassName="bg-destructive-soft text-destructive"
      title={title}
      description={description}
      className={className}
    >
      {onRetry ? (
        <AppButton variant="secondary" onClick={onRetry} className="mt-1">
          <RotateCw />
          Tekrar Dene
        </AppButton>
      ) : null}
    </StateCard>
  );
}
