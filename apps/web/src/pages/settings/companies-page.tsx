import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
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
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import { CompanyDialog } from '@/features/companies/company-dialogs';
import { companyPath, HAZARD_CLASS } from '@/features/companies/company-labels';
import { toCompanyInput } from '@/features/companies/company-schemas';
import { useCompanyMutations, useCompanyPage } from '@/features/companies/use-companies';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export function CompaniesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const companies = useCompanyPage({
    page,
    pageSize: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const { create } = useCompanyMutations();

  return (
    <>
      <PageHeader
        title="Firma Tanımları"
        description="Hizmet verilen işverenler; her firmanın şubeleri ve SGK sicilli işyerleri firma kartında yönetilir."
        breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Firma Tanımları' }]}
        actions={
          <Can permission={PERMISSIONS.COMPANIES_CREATE}>
            <AppButton onClick={() => setDialogOpen(true)}>
              <Plus />
              Yeni Firma
            </AppButton>
          </Can>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Firma ara"
              placeholder="Firma adı, vergi no veya SGK sicil no"
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {companies.isPending ? (
          <LoadingState title="Firmalar yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {companies.error ? (
          <ErrorState onRetry={() => void companies.refetch()} className="rounded-none border-0" />
        ) : null}
        {companies.data ? (
          companies.data.items.length === 0 ? (
            <EmptyState
              title={debouncedSearch ? 'Firma bulunamadı' : 'Henüz firma tanımlanmadı'}
              description={
                debouncedSearch
                  ? 'Farklı bir ad veya numara deneyin.'
                  : '"Yeni Firma" ile ilk işvereni ekleyin.'
              }
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead>Vergi No</TableHead>
                    <TableHead>SGK Sicil No</TableHead>
                    <TableHead>Tehlike Sınıfı</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead className="text-right">Şube</TableHead>
                    <TableHead className="text-right">Hasta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.data.items.map((company) => (
                    <TableRow
                      key={company.id}
                      className="cursor-pointer"
                      onClick={() => void navigate(companyPath(company.id))}
                    >
                      <TableCell className="font-medium text-foreground">
                        <Link
                          to={companyPath(company.id)}
                          className="hover:text-primary-dark"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {company.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {company.taxNumber ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {company.sgkRegistrationNumber ?? '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={HAZARD_CLASS[company.hazardClass].status}
                          label={HAZARD_CLASS[company.hazardClass].label}
                        />
                      </TableCell>
                      <TableCell>{company.phone ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {company._count.branches}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {company._count.employees}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination meta={companies.data.meta} onPageChange={setPage} />
            </>
          )
        ) : null}
      </div>

      <CompanyDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) create.reset();
        }}
        submitting={create.isPending}
        error={create.error}
        onSubmit={(values) =>
          create.mutate(toCompanyInput(values), {
            onSuccess: (company) => {
              toast.success('Firma oluşturuldu', company.name);
              setDialogOpen(false);
              void navigate(companyPath(company.id));
            },
          })
        }
      />
    </>
  );
}
