import type { PhysicianStatus } from '@osgb/shared-types';
import { PenLine, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { PhysicianDialog, SignatureDialog } from '@/features/physicians/physician-dialogs';
import { PHYSICIAN_STATUS, physicianDisplayName } from '@/features/physicians/physician-labels';
import { toPhysicianInput } from '@/features/physicians/physician-schema';
import { usePhysicianMutations, usePhysicians } from '@/features/physicians/use-physicians';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toApiError } from '@/services/api-client';
import type { Physician } from '@/types/physician';

type Action =
  { kind: 'new' } | { kind: 'edit' | 'signature' | 'remove'; physician: Physician } | null;

export function DoctorsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PhysicianStatus | null>('ACTIVE');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const physicians = usePhysicians({
    page,
    pageSize: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
  });
  const mutations = usePhysicianMutations();
  const close = () => {
    setAction(null);
    mutations.create.reset();
    mutations.update.reset();
  };
  const fail = (title: string) => (error: unknown) => toast.error(title, toApiError(error).message);

  return (
    <>
      <PageHeader
        title="Doktor Tanımları"
        description="Muayene yapan, rapor yazan ve imzalayan hekimler; unvan, belge numaraları ve imza görseli."
        breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Doktor Tanımları' }]}
        actions={
          <Can permission={PERMISSIONS.PHYSICIANS_MANAGE}>
            <AppButton onClick={() => setAction({ kind: 'new' })}>
              <Plus />
              Yeni Doktor
            </AppButton>
          </Can>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Doktor ara"
              placeholder="Ad, branş veya diploma no"
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div role="group" aria-label="Durum filtresi" className="flex gap-1.5">
            <FilterChip
              label="Tümü"
              active={status === null}
              onClick={() => {
                setStatus(null);
                setPage(1);
              }}
            />
            {(Object.keys(PHYSICIAN_STATUS) as PhysicianStatus[]).map((value) => (
              <FilterChip
                key={value}
                label={PHYSICIAN_STATUS[value].label}
                active={status === value}
                onClick={() => {
                  setStatus(status === value ? null : value);
                  setPage(1);
                }}
              />
            ))}
          </div>
        </div>

        {physicians.isPending ? (
          <LoadingState title="Doktorlar yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {physicians.error ? (
          <ErrorState onRetry={() => void physicians.refetch()} className="rounded-none border-0" />
        ) : null}
        {physicians.data ? (
          physicians.data.items.length === 0 ? (
            <EmptyState
              title={debouncedSearch || status ? 'Doktor bulunamadı' : 'Henüz doktor tanımlanmadı'}
              description='"Yeni Doktor" ile hekim ekleyin; imza ve giriş hesabı sonradan bağlanabilir.'
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doktor</TableHead>
                    <TableHead>Branş</TableHead>
                    <TableHead>Diploma / Tescil</TableHead>
                    <TableHead>Belge No</TableHead>
                    <TableHead>Giriş Hesabı</TableHead>
                    <TableHead>İmza</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {physicians.data.items.map((physician) => (
                    <TableRow key={physician.id}>
                      <TableCell className="font-medium text-foreground">
                        {physicianDisplayName(physician)}
                        {physician.phone ? (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {physician.phone}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{physician.specialty ?? '—'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {physician.diplomaNumber ?? '—'}
                        {physician.diplomaRegistrationNumber ? (
                          <span className="block text-xs text-muted-foreground">
                            {physician.diplomaRegistrationNumber}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {physician.certificateNumber ?? '—'}
                      </TableCell>
                      <TableCell>
                        {physician.user ? (
                          physician.user.email
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {physician.signatureUpdatedAt ? (
                          <Badge>Yüklü</Badge>
                        ) : (
                          <Badge variant="neutral">Yok</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={PHYSICIAN_STATUS[physician.status].status}
                          label={PHYSICIAN_STATUS[physician.status].label}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Can permission={PERMISSIONS.PHYSICIANS_MANAGE}>
                          <div className="flex justify-end gap-1">
                            <AppButton
                              size="sm"
                              variant="ghost"
                              aria-label={`${physicianDisplayName(physician)} imza`}
                              onClick={() => setAction({ kind: 'signature', physician })}
                            >
                              <PenLine />
                            </AppButton>
                            <AppButton
                              size="sm"
                              variant="ghost"
                              aria-label={`${physicianDisplayName(physician)} düzenle`}
                              onClick={() => setAction({ kind: 'edit', physician })}
                            >
                              <Pencil />
                            </AppButton>
                            <AppButton
                              size="sm"
                              variant="ghost"
                              aria-label={`${physicianDisplayName(physician)} sil`}
                              onClick={() => setAction({ kind: 'remove', physician })}
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
              <Pagination meta={physicians.data.meta} onPageChange={setPage} />
            </>
          )
        ) : null}
      </div>

      <PhysicianDialog
        open={action?.kind === 'new' || action?.kind === 'edit'}
        onOpenChange={(open) => !open && close()}
        physician={action?.kind === 'edit' ? action.physician : null}
        submitting={mutations.create.isPending || mutations.update.isPending}
        error={mutations.create.error ?? mutations.update.error}
        onSubmit={(values) => {
          const input = toPhysicianInput(values);
          if (action?.kind === 'edit')
            mutations.update.mutate(
              { id: action.physician.id, input },
              {
                onSuccess: () => {
                  toast.success('Doktor güncellendi');
                  close();
                },
              },
            );
          else
            mutations.create.mutate(input, {
              onSuccess: (p) => {
                toast.success('Doktor eklendi', physicianDisplayName(p));
                close();
              },
            });
        }}
      />
      <SignatureDialog
        open={action?.kind === 'signature'}
        onOpenChange={(open) => !open && setAction(null)}
        physician={
          action?.kind === 'signature'
            ? (physicians.data?.items.find((p) => p.id === action.physician.id) ?? action.physician)
            : null
        }
      />
      <ConfirmDialog
        open={action?.kind === 'remove'}
        onOpenChange={(open) => !open && setAction(null)}
        title="Doktor silinsin mi?"
        description={
          action?.kind === 'remove'
            ? `${physicianDisplayName(action.physician)} pasife alınır; geçmiş raporlar etkilenmez.`
            : undefined
        }
        loading={mutations.remove.isPending}
        onConfirm={() =>
          action?.kind === 'remove' &&
          mutations.remove.mutate(action.physician.id, {
            onSuccess: () => {
              toast.success('Doktor silindi');
              setAction(null);
            },
            onError: fail('Silinemedi'),
          })
        }
      />
    </>
  );
}
