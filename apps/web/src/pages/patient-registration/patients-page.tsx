import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { formatGsm, PERMISSIONS } from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
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
import { EmployeeStatusBadge } from '@/features/patients/patient-badges';
import { usePatients } from '@/features/patients/use-patients';
import { formatDate, maskNationalId, patientPath } from '@/features/patients/patient-utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export function PatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const patients = usePatients({
    page,
    pageSize: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  return (
    <>
      <PageHeader
        title="Hasta Kayıt"
        description="Kayıtlı hastalar (çalışanlar). TC Kimlik No, sicil/belge no, ad veya telefonla arayın."
        breadcrumbs={[{ label: 'Hasta Kayıt Kabul' }, { label: 'Hasta Kayıt' }]}
        actions={
          <Can permission={PERMISSIONS.EMPLOYEES_CREATE}>
            <AppButton asChild>
              <Link to={PATHS.patientNew}>
                <Plus />
                Yeni Hasta
              </Link>
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
              aria-label="Hasta ara"
              placeholder="Ad, TC Kimlik No, sicil/belge no veya telefon"
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {patients.isPending ? (
          <LoadingState title="Hastalar yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {patients.error ? (
          <ErrorState onRetry={() => void patients.refetch()} className="rounded-none border-0" />
        ) : null}
        {patients.data ? (
          patients.data.items.length === 0 ? (
            <EmptyState
              title={debouncedSearch ? 'Arama sonucu bulunamadı' : 'Henüz hasta kaydı yok'}
              description={
                debouncedSearch
                  ? 'Farklı bir ad, TC Kimlik No veya sicil no deneyin.'
                  : 'İlk hastayı kaydettiğinizde burada listelenir.'
              }
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>TC Kimlik No</TableHead>
                    <TableHead>Sicil / Belge No</TableHead>
                    <TableHead>GSM</TableHead>
                    <TableHead>Doğum Tarihi</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.data.items.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className="cursor-pointer"
                      onClick={() => void navigate(patientPath(patient.id))}
                    >
                      <TableCell className="font-medium text-foreground">
                        <Link
                          to={patientPath(patient.id)}
                          className="hover:text-primary-dark"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {patient.firstName} {patient.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {maskNationalId(patient.nationalId)}
                      </TableCell>
                      <TableCell>{patient.registrationNumber ?? '—'}</TableCell>
                      <TableCell>{patient.phone ? formatGsm(patient.phone) : '—'}</TableCell>
                      <TableCell>{formatDate(patient.birthDate)}</TableCell>
                      <TableCell>{patient.company?.name ?? '—'}</TableCell>
                      <TableCell>
                        <EmployeeStatusBadge value={patient.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination meta={patients.data.meta} onPageChange={setPage} />
            </>
          )
        ) : null}
      </div>
    </>
  );
}
