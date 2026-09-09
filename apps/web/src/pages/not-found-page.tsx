import { SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { AppButton } from '@/design-system/app-button';
import { StateCard } from '@/design-system/state-card';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <StateCard
        icon={SearchX}
        iconClassName="bg-muted text-muted-foreground"
        title="Sayfa bulunamadı"
        description="Aradığınız adres mevcut değil ya da taşınmış olabilir."
        className="w-full max-w-[420px]"
      >
        <AppButton asChild variant="primary" className="mt-1">
          <Link to={PATHS.dashboard}>Dashboard'a dön</Link>
        </AppButton>
      </StateCard>
    </div>
  );
}
