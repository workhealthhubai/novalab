import { PERMISSIONS } from '@osgb/shared-types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppButton } from '@/design-system/app-button';
import { PageHeader } from '@/design-system/page-header';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { Pagination } from '@/design-system/pagination';
import { toast } from '@/design-system/toast';
import { signaturesService } from '@/services/signatures.service';
import { toApiError } from '@/services/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDateTime } from '@/features/patients/patient-utils';
import { PATHS } from '@/app/router/navigation';

export function ESignaturePage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const term = useDebouncedValue(search, 300);
  const records = useQuery({
    queryKey: ['signatures', 'archive', page, term],
    queryFn: () => signaturesService.list({ page, pageSize: 20, search: term }),
    enabled: can(PERMISSIONS.DOCUMENTS_READ),
  });
  const verify = useMutation({
    mutationFn: (id: string) => signaturesService.verify(id),
    onSuccess: (result) =>
      result.valid
        ? toast.success('Belge bütünlüğü doğrulandı', 'Saklanan PDF imza anındaki dosyayla aynı.')
        : toast.error(
            'Belge bütünlüğü doğrulanamadı',
            'Dosyanın SHA-256 değeri imza kaydıyla eşleşmiyor.',
          ),
    onError: (e) => toast.error('Doğrulama yapılamadı', toApiError(e).message),
  });
  const download = useMutation({
    mutationFn: (id: string) => signaturesService.downloadUrl(id),
    onSuccess: (result) => {
      const a = document.createElement('a');
      a.href = result.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    },
    onError: (e) => toast.error('Belge açılamadı', toApiError(e).message),
  });
  return (
    <>
      <PageHeader
        title="E-İmza"
        description="İmzalı belge arşivi, PDF indirme ve dosya bütünlüğü doğrulama."
      />
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">İmza altyapısı</h2>
        <p className="text-sm text-muted-foreground">
          Bu arşiv imza pediyle imzalanan belgeleri içerir. Doğrulama, PDF dosyasının SHA-256
          bütünlük kontrolüdür. Nitelikli elektronik imza sağlayıcısı bağlı değildir; sertifikayla
          elektronik imzalama bu kurulumda kullanılamaz.
        </p>
        <div className="flex flex-wrap gap-3">
          {can(PERMISSIONS.DOCUMENTS_READ) && can(PERMISSIONS.DOCUMENTS_SIGN) && (
            <AppButton asChild>
              <Link to={PATHS.documentSigning}>Belge imzala</Link>
            </AppButton>
          )}
          {can(PERMISSIONS.EXAMINATIONS_READ) && (
            <AppButton asChild variant="secondary">
              <Link to={PATHS.healthReports}>Hekim raporları ve onay</Link>
            </AppButton>
          )}
        </div>
      </div>
      {can(PERMISSIONS.DOCUMENTS_READ) ? (
        <>
          <Input
            aria-label="İmzalı belge ara"
            className="sm:max-w-sm"
            placeholder="Belge veya hasta ara…"
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
                          <TableHead>Belge</TableHead>
                          <TableHead>İmzalayan</TableHead>
                          <TableHead>Tarih</TableHead>
                          <TableHead>İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.data.items.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.title}</TableCell>
                            <TableCell>{record.signerName}</TableCell>
                            <TableCell>{formatDateTime(record.signedAt)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <AppButton
                                  size="sm"
                                  variant="secondary"
                                  loading={verify.isPending && verify.variables === record.id}
                                  disabled={verify.isPending}
                                  onClick={() => verify.mutate(record.id)}
                                >
                                  Bütünlüğü doğrula
                                </AppButton>
                                <AppButton
                                  size="sm"
                                  variant="ghost"
                                  loading={download.isPending && download.variables === record.id}
                                  disabled={download.isPending}
                                  onClick={() => download.mutate(record.id)}
                                >
                                  PDF aç
                                </AppButton>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState
                    title="İmzalı belge bulunamadı"
                    description="Belge İmza ekranından imzalanan belgeler burada listelenir."
                  />
                )}
                <Pagination meta={records.data.meta} onPageChange={setPage} />
              </div>
            )
          )}
        </>
      ) : (
        <EmptyState
          title="Arşiv erişim yetkisi gerekli"
          description="İmzalı belgeleri görüntülemek için belge okuma yetkisi gerekir."
        />
      )}
    </>
  );
}
