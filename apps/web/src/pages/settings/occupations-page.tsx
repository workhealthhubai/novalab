import { DownloadCloud, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS } from '@osgb/shared-types';
import { Can } from '@/components/can';
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
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { FilterChip } from '@/design-system/filter-chip';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import { OccupationDialog } from '@/features/occupations/occupation-dialog';
import { toOccupationInput } from '@/features/occupations/occupation-schema';
import { useOccupationMutations, useOccupations } from '@/features/occupations/use-occupations';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toApiError } from '@/services/api-client';
import type { Occupation } from '@/types/occupation';

type Action =
  { kind: 'new' } | { kind: 'edit' | 'remove'; occupation: Occupation } | { kind: 'import' } | null;

export function OccupationsPage() {
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const occupations = useOccupations({
    page,
    pageSize: 50,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(onlyActive ? { isActive: true } : {}),
  });
  const mutations = useOccupationMutations();
  const close = () => {
    setAction(null);
    mutations.create.reset();
    mutations.update.reset();
  };
  const fail = (title: string) => (error: unknown) => toast.error(title, toApiError(error).message);

  return (
    <>
      <PageHeader
        title="Meslek Tanımları"
        description="Hasta kaydında seçilen meslekler; periyodik muayene ve tehlike kuralları buna bağlanacak."
        breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Meslek Tanımları' }]}
        actions={
          <Can permission={PERMISSIONS.OCCUPATIONS_MANAGE}>
            <AppButton variant="secondary" onClick={() => setAction({ kind: 'import' })}>
              <DownloadCloud />
              Varsayılan Listeyi Yükle
            </AppButton>
            <AppButton onClick={() => setAction({ kind: 'new' })}>
              <Plus />
              Yeni Meslek
            </AppButton>
          </Can>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Meslek ara"
              placeholder="Ad veya kod"
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <FilterChip
            className="sm:ml-auto"
            label={onlyActive ? 'Yalnızca aktifler' : 'Pasifler dahil'}
            active={onlyActive}
            onClick={() => {
              setOnlyActive((v) => !v);
              setPage(1);
            }}
          />
        </div>

        {occupations.isPending ? (
          <LoadingState title="Meslekler yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {occupations.error ? (
          <ErrorState
            onRetry={() => void occupations.refetch()}
            className="rounded-none border-0"
          />
        ) : null}
        {occupations.data ? (
          occupations.data.items.length === 0 ? (
            <EmptyState
              title={debouncedSearch ? 'Meslek bulunamadı' : 'Henüz meslek tanımlanmadı'}
              description={
                debouncedSearch
                  ? 'Farklı bir ad veya kod deneyin.'
                  : '"Varsayılan Listeyi Yükle" ile ISCO-08 tabanlı hazır listeyle başlayabilir, sonra düzenleyebilirsiniz.'
              }
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Meslek</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="text-right">Hasta</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occupations.data.items.map((occupation) => (
                    <TableRow key={occupation.id}>
                      <TableCell className="font-mono text-sm">{occupation.code ?? '—'}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        {occupation.name}
                      </TableCell>
                      <TableCell className="max-w-[360px] truncate text-muted-foreground">
                        {occupation.description ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {occupation._count.employees}
                      </TableCell>
                      <TableCell>
                        {occupation.isActive ? (
                          <StatusBadge status="completed" label="Aktif" />
                        ) : (
                          <StatusBadge status="cancelled" label="Pasif" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Can permission={PERMISSIONS.OCCUPATIONS_MANAGE}>
                          <div className="flex justify-end gap-1">
                            <AppButton
                              size="sm"
                              variant="ghost"
                              aria-label={`${occupation.name} düzenle`}
                              onClick={() => setAction({ kind: 'edit', occupation })}
                            >
                              <Pencil />
                            </AppButton>
                            <AppButton
                              size="sm"
                              variant="ghost"
                              aria-label={`${occupation.name} sil`}
                              onClick={() => setAction({ kind: 'remove', occupation })}
                            >
                              <Trash2 />
                            </AppButton>
                          </div>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination meta={occupations.data.meta} onPageChange={setPage} />
            </>
          )
        ) : null}
      </div>

      <OccupationDialog
        open={action?.kind === 'new' || action?.kind === 'edit'}
        onOpenChange={(open) => !open && close()}
        occupation={action?.kind === 'edit' ? action.occupation : null}
        submitting={mutations.create.isPending || mutations.update.isPending}
        error={mutations.create.error ?? mutations.update.error}
        onSubmit={(values) => {
          const input = toOccupationInput(values);
          if (action?.kind === 'edit')
            mutations.update.mutate(
              { id: action.occupation.id, input },
              {
                onSuccess: () => {
                  toast.success('Meslek güncellendi');
                  close();
                },
              },
            );
          else
            mutations.create.mutate(input, {
              onSuccess: (o) => {
                toast.success('Meslek eklendi', o.name);
                close();
              },
            });
        }}
      />
      <ConfirmDialog
        open={action?.kind === 'import'}
        onOpenChange={(open) => !open && setAction(null)}
        tone="default"
        title="Varsayılan meslek listesi yüklensin mi?"
        description="ISCO-08 tabanlı 43 yaygın meslek eklenir; adı veya kodu zaten tanımlı olanlar atlanır."
        confirmLabel="Yükle"
        loading={mutations.importDefaults.isPending}
        onConfirm={() =>
          mutations.importDefaults.mutate(undefined, {
            onSuccess: ({ imported, skipped }) => {
              toast.success(
                `${imported} meslek eklendi`,
                skipped > 0 ? `${skipped} kayıt zaten vardı` : undefined,
              );
              setAction(null);
            },
            onError: fail('Yüklenemedi'),
          })
        }
      />
      <ConfirmDialog
        open={action?.kind === 'remove'}
        onOpenChange={(open) => !open && setAction(null)}
        title="Meslek silinsin mi?"
        description={
          action?.kind === 'remove'
            ? `${action.occupation.name} pasife alınır; ${action.occupation._count.employees} hastanın kaydındaki meslek bağı korunur.`
            : undefined
        }
        loading={mutations.remove.isPending}
        onConfirm={() =>
          action?.kind === 'remove' &&
          mutations.remove.mutate(action.occupation.id, {
            onSuccess: () => {
              toast.success('Meslek silindi');
              setAction(null);
            },
            onError: fail('Silinemedi'),
          })
        }
      />
    </>
  );
}
