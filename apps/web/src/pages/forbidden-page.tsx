import { ShieldX } from 'lucide-react';
import { Link } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { AppButton } from '@/design-system/app-button';
import { StateCard } from '@/design-system/state-card';

export function ForbiddenPage() {
  return (
    <StateCard
      role="alert"
      icon={ShieldX}
      iconClassName="bg-destructive-soft text-destructive"
      title="Bu sayfaya erişim yetkiniz yok"
      description="Gerekli yetki tanımlı değil. Yetki için sistem yöneticinize başvurun."
    >
      <AppButton asChild variant="secondary" className="mt-1">
        <Link to={PATHS.dashboard}>Dashboard'a dön</Link>
      </AppButton>
    </StateCard>
  );
}
