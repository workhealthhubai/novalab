import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { PERMISSIONS } from '@osgb/shared-types';
import { PageHeader } from '@/design-system/page-header';
import { AppButton } from '@/design-system/app-button';
import { LoadingState } from '@/design-system/loading-state';
import { ErrorState } from '@/design-system/error-state';
import { Pagination } from '@/design-system/pagination';
import { usePermissions } from '@/hooks/use-permissions';
import { workItemsService, type WorkCategory, type WorkItem } from '@/services/work-items.service';
import { protocolPath } from '@/features/protocols/protocol-utils';
import { patientPath, formatDate } from '@/features/patients/patient-utils';
import { reportPath } from '@/features/health-reports/report-labels';
import { PROTOCOL_ITEM_LABELS } from '@/features/protocols/protocol-labels';
const targetPath = (r: WorkItem) =>
  r.target === 'report'
    ? reportPath(r.targetId)
    : r.target === 'protocol'
      ? protocolPath(r.targetId)
      : patientPath(r.targetId);
function WorkSection({ category, title }: { category: WorkCategory; title: string }) {
  const [page, setPage] = useState(1);
  const records = useQuery({
    queryKey: ['work-items', category, page],
    queryFn: () => workItemsService.list(category, page),
    refetchInterval: 60_000,
  });
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">
          {title}
          {records.data ? ` (${records.data.meta.total})` : ''}
        </h2>
        <AppButton variant="ghost" size="sm" onClick={() => void records.refetch()}>
          Yenile
        </AppButton>
      </div>
      {records.isPending ? (
        <LoadingState />
      ) : records.isError ? (
        <ErrorState onRetry={() => void records.refetch()} />
      ) : (
        <>
          {records.data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu grupta bekleyen kayıt yok.</p>
          ) : (
            <ul className="divide-y">
              {records.data.items.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link className="font-medium text-primary hover:underline" to={targetPath(r)}>
                      {r.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {r.description} · {formatDate(r.date)}
                    </p>
                    <p className="text-sm">
                      {r.reasons
                        .map((reason) =>
                          category === 'pending'
                            ? (PROTOCOL_ITEM_LABELS[reason as keyof typeof PROTOCOL_ITEM_LABELS] ??
                              reason)
                            : reason,
                        )
                        .join(' · ')}
                    </p>
                  </div>
                  <AppButton asChild variant="secondary" size="sm">
                    <Link to={targetPath(r)}>Kaydı aç</Link>
                  </AppButton>
                </li>
              ))}
            </ul>
          )}
          <Pagination meta={records.data.meta} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
export function WorkItemsPage() {
  const { can } = usePermissions();
  return (
    <>
      <PageHeader
        title="Eksik İşlemler"
        description="Bekleyen istemler, onaylanmamış raporlar ve eksik çalışan bilgileri. Listeler dakikada bir yenilenir."
      />
      <p className="text-sm text-muted-foreground">
        İstemlerde açık/devam eden protokoller esas alınır. Çalışan kontrolü kimlik numarası, doğum
        tarihi ve firma atamasını kapsar. Raporların diğer onay engellerini rapor detayında
        inceleyin.
      </p>
      {can(PERMISSIONS.PROTOCOLS_READ) && (
        <WorkSection category="pending" title="Bekleyen tetkik ve rapor istemleri" />
      )}
      {can(PERMISSIONS.EXAMINATIONS_READ) && (
        <WorkSection category="reports" title="Onaylanmamış raporlar" />
      )}
      {can(PERMISSIONS.EMPLOYEES_READ) && (
        <WorkSection category="missing" title="Eksik çalışan bilgileri" />
      )}
      {!can(PERMISSIONS.PROTOCOLS_READ) &&
        !can(PERMISSIONS.EXAMINATIONS_READ) &&
        !can(PERMISSIONS.EMPLOYEES_READ) && (
          <p>İş listelerini görmek için ilgili kayıtları okuma yetkisi gerekir.</p>
        )}
    </>
  );
}
