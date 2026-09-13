import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ArrowUpRight, Building2, ClipboardList, FileCheck2, Users } from 'lucide-react';
import { PageHeader } from '@/design-system/page-header';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { operationsService } from '@/services/operations.service';
import { PATHS, NAV_LEAVES } from '@/app/router/navigation';
import { usePermissions } from '@/hooks/use-permissions';

export function DashboardPage() {
  const { can } = usePermissions();
  const summary = useQuery({
    queryKey: ['operations', 'dashboard'],
    queryFn: () => operationsService.dashboard(),
    refetchInterval: 60000,
  });
  const cards = [
    { key: 'patients', label: 'Kayıtlı hasta', path: PATHS.patients, icon: Users },
    { key: 'companies', label: 'Kayıtlı firma', path: PATHS.companies, icon: Building2 },
    { key: 'protocols', label: 'Açık protokol', path: PATHS.protocols, icon: ClipboardList },
    { key: 'reports', label: 'Onay bekleyen rapor', path: PATHS.healthReports, icon: FileCheck2 },
  ] as const;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Kurumunuzun güncel kayıtları, açık işleri ve modüllere hızlı erişim."
      />
      {summary.isPending ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState onRetry={() => void summary.refetch()} />
      ) : (
        summary.data && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards
              .filter((card) => summary.data[card.key] !== null)
              .map((card) => (
                <Link
                  key={card.key}
                  to={card.path}
                  className="rounded-xl border bg-card p-5 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between text-muted-foreground">
                    <card.icon className="size-5" />
                    <ArrowUpRight className="size-4" />
                  </div>
                  <p className="mt-5 text-3xl font-semibold">{summary.data[card.key]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
                </Link>
              ))}
          </div>
        )
      )}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Hızlı erişim</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {NAV_LEAVES.filter(
            (leaf) => leaf.path !== PATHS.dashboard && (!leaf.permission || can(leaf.permission)),
          ).map((leaf) => (
            <Link
              key={leaf.path}
              to={leaf.path}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:border-primary"
            >
              <leaf.icon className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">{leaf.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{leaf.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
