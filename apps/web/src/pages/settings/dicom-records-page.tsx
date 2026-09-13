import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PERMISSIONS } from '@osgb/shared-types';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/design-system/page-header';
import { ErrorState } from '@/design-system/error-state';
import { EmptyState } from '@/design-system/empty-state';
import { LoadingState } from '@/design-system/loading-state';
import { Pagination } from '@/design-system/pagination';
import { AppButton } from '@/design-system/app-button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { radiologyService } from '@/services/radiology.service';
import { toApiError } from '@/services/api-client';
import { toast } from '@/design-system/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDateTime } from '@/features/patients/patient-utils';
import { PATHS } from '@/app/router/navigation';

export function DicomRecordsPage() {
  const { can } = usePermissions();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const term = useDebouncedValue(search, 300);
  const records = useQuery({
    queryKey: ['dicom-records', page, term],
    queryFn: () => radiologyService.list({ page, pageSize: 20, ...(term ? { search: term } : {}) }),
  });
  const status = useQuery({
    queryKey: ['dicom-operations'],
    queryFn: () => radiologyService.operationsStatus(),
  });
  const incoming = useQuery({
    queryKey: ['dicom-incoming'],
    queryFn: () => radiologyService.unlinked(50),
  });
  const reconcile = useMutation({
    mutationFn: () => radiologyService.reconcile(50),
    onSuccess: (result) => {
      toast.success(
        'PACS eşleştirmesi tamamlandı',
        `${result.linked} eşleşti · ${result.ambiguous} kontrol gerekli · ${result.waiting} bekliyor`,
      );
      void client.invalidateQueries({ queryKey: ['dicom-records'] });
      void client.invalidateQueries({ queryKey: ['dicom-operations'] });
      void client.invalidateQueries({ queryKey: ['dicom-incoming'] });
      void client.invalidateQueries({ queryKey: ['radiology'] });
    },
    onError: (e) => toast.error('Eşleştirme başarısız', toApiError(e).message),
  });
  return (
    <>
      <PageHeader
        title="DICOM Kayıtları"
        description="Kurumunuza ait radyoloji istekleri, bağlı DICOM çalışmaları ve PACS eşleştirme takibi."
      />
      {status.data && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['PACS bağlantısı', status.data.connection === 'ONLINE' ? 'Çevrimiçi' : 'Çevrimdışı'],
            ['Görüntü bekleyen istek', status.data.awaitingStudy],
            ['Başarısız iş listesi', status.data.failedWorklists],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}
      {status.isError && (
        <ErrorState title="PACS durumu alınamadı" onRetry={() => void status.refetch()} />
      )}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Eşleştirme bekleyen çalışmalar</h2>
          {can(PERMISSIONS.RADIOLOGY_CREATE) && (
            <AppButton loading={reconcile.isPending} onClick={() => reconcile.mutate()}>
              PACS ile eşleştir
            </AppButton>
          )}
        </div>
        {incoming.isPending ? (
          <LoadingState />
        ) : incoming.isError ? (
          <ErrorState onRetry={() => void incoming.refetch()} />
        ) : incoming.data?.length ? (
          <ul className="divide-y">
            {incoming.data.map((study) => (
              <li key={study.orthancStudyId} className="flex flex-wrap justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">
                    {study.description || 'DICOM çalışması'} · {study.modalities.join(', ')}
                  </p>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {study.studyInstanceUid}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {study.seriesCount} seri · {study.instanceCount} görüntü
                  </p>
                </div>
                <Link
                  className="text-sm text-primary underline"
                  to={PATHS.radiologyStudy.replace(':requestId', study.requestId)}
                >
                  İsteği aç
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Eşleştirme bekleyen çalışma yok.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Her sorguda en fazla 50 gelen çalışma kontrol edilir.
        </p>
      </section>
      <Input
        className="sm:max-w-sm"
        aria-label="DICOM kaydı ara"
        placeholder="Hasta veya istek ara…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {records.isPending ? (
        <LoadingState />
      ) : records.isError ? (
        <ErrorState onRetry={() => void records.refetch()} />
      ) : (
        records.data && (
          <div className="overflow-hidden rounded-xl border bg-card">
            {records.data.items.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Hasta</TableHead>
                      <TableHead>Modalite</TableHead>
                      <TableHead>Accession / Study UID</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.data.items.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(record.requestedAt)}
                        </TableCell>
                        <TableCell>
                          {record.employee.firstName} {record.employee.lastName}
                        </TableCell>
                        <TableCell>{record.modality}</TableCell>
                        <TableCell>
                          <p>{record.accessionNumber || '—'}</p>
                          <p className="max-w-xs break-all font-mono text-xs text-muted-foreground">
                            {record.studyInstanceUid || 'Görüntü bekleniyor'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Link
                            className="text-primary underline"
                            to={PATHS.radiologyStudy.replace(':requestId', record.id)}
                          >
                            Görüntü / detay
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState title="DICOM isteği bulunamadı" />
            )}
            <Pagination meta={records.data.meta} onPageChange={setPage} />
          </div>
        )
      )}
    </>
  );
}
