import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS } from '@osgb/shared-types';
import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
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
import { PackageDialog } from '@/features/test-packages/package-dialog';
import { toPackageInput } from '@/features/test-packages/package-schema';
import {
  useTestPackageMutations,
  useTestPackages,
} from '@/features/test-packages/use-test-packages';
import { formatPrice, TEST_CATEGORY_LABELS } from '@/features/tests/test-labels';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toApiError } from '@/services/api-client';
import type { TestPackage } from '@/types/test-package';

type Action = { kind: 'new' } | { kind: 'edit' | 'remove'; pkg: TestPackage } | null;

export function TestPackagesPage() {
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const packages = useTestPackages({
    page,
    pageSize: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(onlyActive ? { isActive: true } : {}),
  });
  const mutations = useTestPackageMutations();
  const close = () => {
    setAction(null);
    mutations.create.reset();
    mutations.update.reset();
  };

  return (
    <>
      <PageHeader
        title="Tetkik Paketleri"
        description="Ziyaret türlerine göre hazır tetkik setleri; protokol açarken tek seçimle uygulanır."
        breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Tetkik Paketleri' }]}
        actions={
          <Can permission={PERMISSIONS.TESTS_MANAGE}>
            <AppButton onClick={() => setAction({ kind: 'new' })}>
              <Plus />
              Yeni Paket
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
              aria-label="Paket ara"
              placeholder="Kod veya ad"
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

        {packages.isPending ? (
          <LoadingState title="Paketler yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {packages.error ? (
          <ErrorState onRetry={() => void packages.refetch()} className="rounded-none border-0" />
        ) : null}
        {packages.data ? (
          packages.data.items.length === 0 ? (
            <EmptyState
              title={debouncedSearch ? 'Paket bulunamadı' : 'Henüz paket tanımlanmadı'}
              description='"Yeni Paket" ile tetkik tanımlarından bir set oluşturun.'
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Tetkikler</TableHead>
                    <TableHead className="text-right">Tetkik toplamı</TableHead>
                    <TableHead className="text-right">Paket fiyatı</TableHead>
                    <TableHead className="text-right">KDV dahil</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.data.items.map((pkg) => {
                    const categories = [...new Set(pkg.items.map((i) => i.test.category))];
                    return (
                      <TableRow key={pkg.id}>
                        <TableCell className="font-mono text-sm font-medium text-foreground">
                          {pkg.code}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {pkg.name}
                          {pkg.description ? (
                            <span className="block max-w-[320px] truncate text-xs font-normal text-muted-foreground">
                              {pkg.description}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="neutral">{pkg.items.length} tetkik</Badge>
                            {categories.map((c) => (
                              <Badge key={c} variant="outline">
                                {TEST_CATEGORY_LABELS[c]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPrice(pkg.totals.itemsNet)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {pkg.price === null ? (
                            <span className="text-muted-foreground">= toplam</span>
                          ) : (
                            formatPrice(pkg.totals.net)
                          )}
                          {pkg.totals.discount > 0 ? (
                            <span className="block text-xs text-success">
                              −{formatPrice(pkg.totals.discount)}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPrice(pkg.totals.gross)}
                        </TableCell>
                        <TableCell>
                          {pkg.isActive ? (
                            <StatusBadge status="completed" label="Aktif" />
                          ) : (
                            <StatusBadge status="cancelled" label="Pasif" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Can permission={PERMISSIONS.TESTS_MANAGE}>
                            <div className="flex justify-end gap-1">
                              <AppButton
                                size="sm"
                                variant="ghost"
                                aria-label={`${pkg.name} düzenle`}
                                onClick={() => setAction({ kind: 'edit', pkg })}
                              >
                                <Pencil />
                              </AppButton>
                              <AppButton
                                size="sm"
                                variant="ghost"
                                aria-label={`${pkg.name} sil`}
                                onClick={() => setAction({ kind: 'remove', pkg })}
                              >
                                <Trash2 />
                              </AppButton>
                            </div>
                          </Can>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination meta={packages.data.meta} onPageChange={setPage} />
            </>
          )
        ) : null}
      </div>

      <PackageDialog
        open={action?.kind === 'new' || action?.kind === 'edit'}
        onOpenChange={(open) => !open && close()}
        pkg={action?.kind === 'edit' ? action.pkg : null}
        submitting={mutations.create.isPending || mutations.update.isPending}
        error={mutations.create.error ?? mutations.update.error}
        onSubmit={(values) => {
          const input = toPackageInput(values);
          if (action?.kind === 'edit')
            mutations.update.mutate(
              { id: action.pkg.id, input },
              {
                onSuccess: () => {
                  toast.success('Paket güncellendi');
                  close();
                },
              },
            );
          else
            mutations.create.mutate(input, {
              onSuccess: (p) => {
                toast.success('Paket eklendi', `${p.code} · ${p.name}`);
                close();
              },
            });
        }}
      />
      <ConfirmDialog
        open={action?.kind === 'remove'}
        onOpenChange={(open) => !open && setAction(null)}
        title="Paket silinsin mi?"
        description={
          action?.kind === 'remove'
            ? `${action.pkg.code} · ${action.pkg.name} kaldırılır; tetkik tanımları etkilenmez.`
            : undefined
        }
        loading={mutations.remove.isPending}
        onConfirm={() =>
          action?.kind === 'remove' &&
          mutations.remove.mutate(action.pkg.id, {
            onSuccess: () => {
              toast.success('Paket silindi');
              setAction(null);
            },
            onError: (error) => toast.error('Silinemedi', toApiError(error).message),
          })
        }
      />
    </>
  );
}
