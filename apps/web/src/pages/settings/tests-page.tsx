import type { TestCategory } from '@osgb/shared-types';
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
import { TestDialog } from '@/features/tests/test-dialog';
import {
  formatPrice,
  grossPrice,
  TEST_CATEGORIES,
  TEST_CATEGORY_LABELS,
} from '@/features/tests/test-labels';
import { toTestInput } from '@/features/tests/test-schema';
import { useTestMutations, useTests } from '@/features/tests/use-tests';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toApiError } from '@/services/api-client';
import type { TestDefinition } from '@/types/test-definition';

type Action = { kind: 'new' } | { kind: 'edit' | 'remove'; test: TestDefinition } | null;

export function TestsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<TestCategory | null>(null);
  const [onlyActive, setOnlyActive] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const tests = useTests({
    page,
    pageSize: 50,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(category ? { category } : {}),
    ...(onlyActive ? { isActive: true } : {}),
  });
  const mutations = useTestMutations();
  const close = () => {
    setAction(null);
    mutations.create.reset();
    mutations.update.reset();
  };

  return (
    <>
      <PageHeader
        title="Tetkik Tanımları"
        description="Sunulan tetkik ve hizmetlerin kataloğu; kategori, liste fiyatı ve laboratuvar referansları."
        breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Tetkik Tanımları' }]}
        actions={
          <Can permission={PERMISSIONS.TESTS_MANAGE}>
            <AppButton onClick={() => setAction({ kind: 'new' })}>
              <Plus />
              Yeni Tetkik
            </AppButton>
          </Can>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Tetkik ara"
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
          <div
            role="group"
            aria-label="Kategori filtresi"
            className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            <FilterChip
              label="Tümü"
              active={category === null}
              onClick={() => {
                setCategory(null);
                setPage(1);
              }}
            />
            {TEST_CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                label={TEST_CATEGORY_LABELS[c]}
                active={category === c}
                onClick={() => {
                  setCategory(category === c ? null : c);
                  setPage(1);
                }}
              />
            ))}
          </div>
        </div>

        {tests.isPending ? (
          <LoadingState title="Tetkikler yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {tests.error ? (
          <ErrorState onRetry={() => void tests.refetch()} className="rounded-none border-0" />
        ) : null}
        {tests.data ? (
          tests.data.items.length === 0 ? (
            <EmptyState
              title={
                debouncedSearch || category ? 'Tetkik bulunamadı' : 'Henüz tetkik tanımlanmadı'
              }
              description='"Yeni Tetkik" ile kataloğu oluşturun; paketler bu tanımlardan kurulur.'
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Tetkik</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Fiyat (KDV hariç)</TableHead>
                    <TableHead className="text-right">KDV</TableHead>
                    <TableHead className="text-right">KDV dahil</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.data.items.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-mono text-sm font-medium text-foreground">
                        {test.code}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {test.name}
                        {test.category === 'LAB' && (test.sampleType || test.referenceRange) ? (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {[
                              test.sampleType,
                              test.referenceRange &&
                                `${test.referenceRange}${test.unit ? ` ${test.unit}` : ''}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TEST_CATEGORY_LABELS[test.category]}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPrice(test.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">%{test.vatRate}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPrice(grossPrice(test.unitPrice, test.vatRate))}
                      </TableCell>
                      <TableCell>
                        {test.isActive ? (
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
                              aria-label={`${test.name} düzenle`}
                              onClick={() => setAction({ kind: 'edit', test })}
                            >
                              <Pencil />
                            </AppButton>
                            <AppButton
                              size="sm"
                              variant="ghost"
                              aria-label={`${test.name} sil`}
                              onClick={() => setAction({ kind: 'remove', test })}
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
              <Pagination meta={tests.data.meta} onPageChange={setPage} />
            </>
          )
        ) : null}
      </div>

      <TestDialog
        open={action?.kind === 'new' || action?.kind === 'edit'}
        onOpenChange={(open) => !open && close()}
        test={action?.kind === 'edit' ? action.test : null}
        submitting={mutations.create.isPending || mutations.update.isPending}
        error={mutations.create.error ?? mutations.update.error}
        onSubmit={(values) => {
          const input = toTestInput(values);
          if (action?.kind === 'edit')
            mutations.update.mutate(
              { id: action.test.id, input },
              {
                onSuccess: () => {
                  toast.success('Tetkik güncellendi');
                  close();
                },
              },
            );
          else
            mutations.create.mutate(input, {
              onSuccess: (t) => {
                toast.success('Tetkik eklendi', `${t.code} · ${t.name}`);
                close();
              },
            });
        }}
      />
      <ConfirmDialog
        open={action?.kind === 'remove'}
        onOpenChange={(open) => !open && setAction(null)}
        title="Tetkik silinsin mi?"
        description={
          action?.kind === 'remove'
            ? `${action.test.code} · ${action.test.name} kataloğdan kaldırılır; geçmiş kayıtlar etkilenmez.`
            : undefined
        }
        loading={mutations.remove.isPending}
        onConfirm={() =>
          action?.kind === 'remove' &&
          mutations.remove.mutate(action.test.id, {
            onSuccess: () => {
              toast.success('Tetkik silindi');
              setAction(null);
            },
            onError: (error) => toast.error('Silinemedi', toApiError(error).message),
          })
        }
      />
    </>
  );
}
