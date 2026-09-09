import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PERMISSIONS } from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import { Can } from '@/components/can';
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
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { SectionCard } from '@/design-system/section-card';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import { BranchDialog, CompanyDialog, WorkplaceDialog } from '@/features/companies/company-dialogs';
import { HAZARD_CLASS } from '@/features/companies/company-labels';
import {
  toBranchInput,
  toCompanyInput,
  toWorkplaceInput,
} from '@/features/companies/company-schemas';
import {
  useBranchMutations,
  useCompany,
  useCompanyMutations,
  useWorkplaceMutations,
} from '@/features/companies/use-companies';
import { toApiError } from '@/services/api-client';
import type { Branch, Workplace } from '@/types/company';

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-base text-foreground' : 'text-base text-foreground'}>
        {value || '—'}
      </dd>
    </div>
  );
}

type Editing =
  | { kind: 'company' }
  | { kind: 'branch'; branch: Branch | null }
  | { kind: 'workplace'; workplace: Workplace | null }
  | null;
type Removing =
  | { kind: 'company' }
  | { kind: 'branch'; branch: Branch }
  | { kind: 'workplace'; workplace: Workplace }
  | null;

export function CompanyDetailPage() {
  const { companyId = '' } = useParams<'companyId'>();
  const navigate = useNavigate();
  const company = useCompany(companyId);
  const companyMut = useCompanyMutations();
  const branchMut = useBranchMutations();
  const workplaceMut = useWorkplaceMutations();
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<Removing>(null);

  const breadcrumbs = [
    { label: 'Genel Ayarlar' },
    { label: 'Firma Tanımları', to: PATHS.companies },
    { label: company.data?.name ?? 'Firma' },
  ];
  if (company.isPending) {
    return (
      <>
        <PageHeader title="Firma" breadcrumbs={breadcrumbs} />
        <LoadingState />
      </>
    );
  }
  if (company.error || !company.data) {
    return (
      <>
        <PageHeader title="Firma" breadcrumbs={breadcrumbs} />
        <ErrorState
          title="Firma bulunamadı"
          description={company.error ? toApiError(company.error).message : undefined}
          onRetry={() => void company.refetch()}
        />
      </>
    );
  }
  const c = company.data;
  const fail = (title: string) => (error: unknown) => toast.error(title, toApiError(error).message);
  const closeEditing = () => {
    setEditing(null);
    companyMut.update.reset();
    branchMut.create.reset();
    branchMut.update.reset();
    workplaceMut.create.reset();
    workplaceMut.update.reset();
  };
  const branchName = (id: string | null) => c.branches.find((b) => b.id === id)?.name ?? '—';

  return (
    <>
      <PageHeader
        title={c.name}
        description={`${HAZARD_CLASS[c.hazardClass].label} · ${c.workplaces.length} işyeri · ${c.branches.length} şube`}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Can permission={PERMISSIONS.COMPANIES_UPDATE}>
              <AppButton variant="secondary" onClick={() => setEditing({ kind: 'company' })}>
                <Pencil />
                Düzenle
              </AppButton>
            </Can>
            <Can permission={PERMISSIONS.COMPANIES_DELETE}>
              <AppButton variant="danger" onClick={() => setRemoving({ kind: 'company' })}>
                <Trash2 />
                Sil
              </AppButton>
            </Can>
          </>
        }
      />

      <SectionCard title="Firma bilgileri">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
          <Field label="Vergi No" value={c.taxNumber} mono />
          <Field label="SGK Sicil No" value={c.sgkRegistrationNumber} mono />
          <div>
            <dt className="text-xs text-muted-foreground">Tehlike Sınıfı</dt>
            <dd className="mt-0.5">
              <StatusBadge
                status={HAZARD_CLASS[c.hazardClass].status}
                label={HAZARD_CLASS[c.hazardClass].label}
              />
            </dd>
          </div>
          <Field label="Telefon" value={c.phone} mono />
          <Field label="e-Posta" value={c.email} />
          <div className="col-span-2 lg:col-span-3">
            <Field label="Adres" value={c.address} />
          </div>
        </dl>
      </SectionCard>

      <SectionCard
        title="Şubeler"
        description="Firmanın idari birimleri; işyerleri bir şubeye bağlanabilir."
        actions={
          <Can permission={PERMISSIONS.COMPANIES_UPDATE}>
            <AppButton
              size="sm"
              variant="secondary"
              onClick={() => setEditing({ kind: 'branch', branch: null })}
            >
              <Plus />
              Şube Ekle
            </AppButton>
          </Can>
        }
      >
        {c.branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz şube tanımlanmadı.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Şube</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {c.branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium text-foreground">{branch.name}</TableCell>
                  <TableCell>{branch.phone ?? '—'}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{branch.address ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Can permission={PERMISSIONS.COMPANIES_UPDATE}>
                      <div className="flex justify-end gap-1">
                        <AppButton
                          size="sm"
                          variant="ghost"
                          aria-label={`${branch.name} düzenle`}
                          onClick={() => setEditing({ kind: 'branch', branch })}
                        >
                          <Pencil />
                        </AppButton>
                        <AppButton
                          size="sm"
                          variant="ghost"
                          aria-label={`${branch.name} sil`}
                          onClick={() => setRemoving({ kind: 'branch', branch })}
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
        )}
      </SectionCard>

      <SectionCard
        title="İşyerleri"
        description="SGK işyeri sicilli çalışma yerleri; hastalar bir işyerine bağlanır."
        actions={
          <Can permission={PERMISSIONS.WORKPLACES_MANAGE}>
            <AppButton
              size="sm"
              variant="secondary"
              onClick={() => setEditing({ kind: 'workplace', workplace: null })}
            >
              <Plus />
              İşyeri Ekle
            </AppButton>
          </Can>
        }
      >
        {c.workplaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz işyeri tanımlanmadı.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İşyeri</TableHead>
                <TableHead>Şube</TableHead>
                <TableHead>SGK Sicil No</TableHead>
                <TableHead>Tehlike Sınıfı</TableHead>
                <TableHead>NACE</TableHead>
                <TableHead className="text-right">Çalışan</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {c.workplaces.map((workplace) => (
                <TableRow key={workplace.id}>
                  <TableCell className="font-medium text-foreground">{workplace.name}</TableCell>
                  <TableCell>{branchName(workplace.branchId)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {workplace.sgkRegistrationNumber ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={HAZARD_CLASS[workplace.hazardClass].status}
                      label={HAZARD_CLASS[workplace.hazardClass].label}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{workplace.naceCode ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {workplace.employeeCount ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Can permission={PERMISSIONS.WORKPLACES_MANAGE}>
                      <div className="flex justify-end gap-1">
                        <AppButton
                          size="sm"
                          variant="ghost"
                          aria-label={`${workplace.name} düzenle`}
                          onClick={() => setEditing({ kind: 'workplace', workplace })}
                        >
                          <Pencil />
                        </AppButton>
                        <AppButton
                          size="sm"
                          variant="ghost"
                          aria-label={`${workplace.name} sil`}
                          onClick={() => setRemoving({ kind: 'workplace', workplace })}
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
        )}
      </SectionCard>

      <CompanyDialog
        open={editing?.kind === 'company'}
        onOpenChange={(open) => !open && closeEditing()}
        company={c}
        submitting={companyMut.update.isPending}
        error={companyMut.update.error}
        onSubmit={(values) =>
          companyMut.update.mutate(
            { id: c.id, input: toCompanyInput(values) },
            {
              onSuccess: () => {
                toast.success('Firma güncellendi');
                closeEditing();
              },
            },
          )
        }
      />
      <BranchDialog
        open={editing?.kind === 'branch'}
        onOpenChange={(open) => !open && closeEditing()}
        branch={editing?.kind === 'branch' ? editing.branch : null}
        submitting={branchMut.create.isPending || branchMut.update.isPending}
        error={branchMut.create.error ?? branchMut.update.error}
        onSubmit={(values) => {
          const input = toBranchInput(c.id, values);
          const done = () => {
            toast.success(
              editing?.kind === 'branch' && editing.branch ? 'Şube güncellendi' : 'Şube eklendi',
            );
            closeEditing();
          };
          if (editing?.kind === 'branch' && editing.branch)
            branchMut.update.mutate({ id: editing.branch.id, input }, { onSuccess: done });
          else branchMut.create.mutate(input, { onSuccess: done });
        }}
      />
      <WorkplaceDialog
        open={editing?.kind === 'workplace'}
        onOpenChange={(open) => !open && closeEditing()}
        workplace={editing?.kind === 'workplace' ? editing.workplace : null}
        branches={c.branches}
        submitting={workplaceMut.create.isPending || workplaceMut.update.isPending}
        error={workplaceMut.create.error ?? workplaceMut.update.error}
        onSubmit={(values) => {
          const input = toWorkplaceInput(c.id, values);
          const done = () => {
            toast.success(
              editing?.kind === 'workplace' && editing.workplace
                ? 'İşyeri güncellendi'
                : 'İşyeri eklendi',
            );
            closeEditing();
          };
          if (editing?.kind === 'workplace' && editing.workplace)
            workplaceMut.update.mutate({ id: editing.workplace.id, input }, { onSuccess: done });
          else workplaceMut.create.mutate(input, { onSuccess: done });
        }}
      />

      <ConfirmDialog
        open={removing?.kind === 'company'}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Firma silinsin mi?"
        description="Firma pasife alınır; hastaları ve protokolleri korunur ancak listelerde firma boş görünür."
        loading={companyMut.remove.isPending}
        onConfirm={() =>
          companyMut.remove.mutate(c.id, {
            onSuccess: () => {
              toast.success('Firma silindi');
              void navigate(PATHS.companies, { replace: true });
            },
            onError: fail('Silinemedi'),
          })
        }
      />
      <ConfirmDialog
        open={removing?.kind === 'branch'}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Şube silinsin mi?"
        description={
          removing?.kind === 'branch' ? `${removing.branch.name} pasife alınır.` : undefined
        }
        loading={branchMut.remove.isPending}
        onConfirm={() =>
          removing?.kind === 'branch' &&
          branchMut.remove.mutate(removing.branch.id, {
            onSuccess: () => {
              toast.success('Şube silindi');
              setRemoving(null);
            },
            onError: fail('Silinemedi'),
          })
        }
      />
      <ConfirmDialog
        open={removing?.kind === 'workplace'}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="İşyeri silinsin mi?"
        description={
          removing?.kind === 'workplace' ? `${removing.workplace.name} pasife alınır.` : undefined
        }
        loading={workplaceMut.remove.isPending}
        onConfirm={() =>
          removing?.kind === 'workplace' &&
          workplaceMut.remove.mutate(removing.workplace.id, {
            onSuccess: () => {
              toast.success('İşyeri silindi');
              setRemoving(null);
            },
            onError: fail('Silinemedi'),
          })
        }
      />
    </>
  );
}
