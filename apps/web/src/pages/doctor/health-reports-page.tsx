import { type ExaminationStatus, type FitnessDecision, PERMISSIONS } from '@osgb/shared-types';
import { FileCheck2, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DateRangePicker, type DateRangeValue } from '@/design-system/date-range-picker';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { FilterChip } from '@/design-system/filter-chip';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { StatusBadge } from '@/design-system/status-badge';
import { EXAMINATION_STATUS, FITNESS_DECISION } from '@/features/examinations/examination-labels';
import { reportPath } from '@/features/health-reports/report-labels';
import {
  useHealthReportMutations,
  useHealthReports,
} from '@/features/health-reports/use-health-reports';
import { AppButton } from '@/design-system/app-button';
import { toast } from '@/design-system/toast';
import { toApiError } from '@/services/api-client';
import {
  formatDate,
  formatDateTime,
  maskNationalId,
  patientPath,
} from '@/features/patients/patient-utils';
import { PROTOCOL_TYPE_LABELS } from '@/features/protocols/protocol-labels';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import { PendingProtocolRows, WorkStatusChips } from '@/features/protocols/pending-rows';
import { usePendingProtocols, type WorkStatus } from '@/features/protocols/use-protocols';

const STATUSES: ExaminationStatus[] = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'APPROVED',
  'CANCELLED',
];
const DECISIONS: FitnessDecision[] = ['PENDING', 'FIT', 'FIT_WITH_RESTRICTIONS', 'UNFIT'];

export function HealthReportsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const { can } = usePermissions();
  const { openForProtocol: openReport } = useHealthReportMutations();
  const [company, setCompany] = useState('');
  const [physician, setPhysician] = useState('');
  const companyTerm = useDebouncedValue(company.trim(), 350);
  const physicianTerm = useDebouncedValue(physician.trim(), 350);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ExaminationStatus | null>(null);
  const [decision, setDecision] = useState<FitnessDecision | null>(null);
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [work, setWork] = useState<WorkStatus>('ALL');
  const filtering = Boolean(
    search.trim() ||
    company.trim() ||
    physician.trim() ||
    status ||
    decision ||
    range.from ||
    range.to ||
    patientId,
  );
  const pending = usePendingProtocols(
    'HEALTH_REPORT',
    work,
    can(PERMISSIONS.EXAMINATIONS_CREATE) && !filtering,
  );
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const reports = useHealthReports({
    page,
    pageSize: 20,
    companySearch: companyTerm || undefined,
    physicianSearch: physicianTerm || undefined,
    ...(patientId ? { employeeId: patientId } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
    ...(decision ? { fitnessDecision: decision } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  });

  return (
    <>
      <PageHeader
        title="Sağlık Raporları"
        description="İşe giriş / periyodik muayene raporları: anamnez, fizik muayene, tetkik özetleri, çalışabilirlik kararı ve hekim onaylı PDF."
        breadcrumbs={[{ label: 'Doktor Modülü' }, { label: 'Sağlık Raporları' }]}
      />
      <p className="-mt-2 text-sm text-muted-foreground">
        Rapor, protokol açıldığında oluşur: Protokol Listesi'nden ilgili protokole girip "Raporu aç"
        ile başlayın{can(PERMISSIONS.EXAMINATIONS_CREATE) ? '' : ' (rapor açma izni gerekir)'}.
      </p>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Rapor ara"
                placeholder="Hasta adı, TC veya protokol no"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <DateRangePicker
              id="hr-range"
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
              placeholder="Muayene tarihi aralığı"
              max={new Date()}
              className="w-full sm:ml-auto sm:w-72"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              aria-label="Firma filtresi"
              placeholder="Firma adında ara"
              maxLength={150}
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setPage(1);
                setWork('ALL');
              }}
            />
            <Input
              aria-label="Hekim filtresi"
              placeholder="Hekim adı veya soyadı"
              maxLength={150}
              value={physician}
              onChange={(e) => {
                setPhysician(e.target.value);
                setPage(1);
                setWork('ALL');
              }}
            />
            <AppButton
              variant="secondary"
              onClick={() => {
                setCompany('');
                setPhysician('');
                setSearch('');
                setStatus(null);
                setDecision(null);
                setRange({ from: '', to: '' });
                setPage(1);
                setWork('ALL');
              }}
            >
              Filtreleri temizle
            </AppButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Tarih filtresi muayene tarihini, yoksa kayıt tarihini kullanır. Filtre uygulandığında
            yalnızca oluşturulmuş raporlar listelenir.
          </p>
          <div
            role="group"
            aria-label="Durum ve karar filtresi"
            className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            <WorkStatusChips
              value={work}
              onChange={(v) => {
                setWork(v);
                setPage(1);
              }}
              pendingCount={pending.total}
            />
            <span className="mx-1 self-center text-border">|</span>
            <FilterChip
              label="Tüm durumlar"
              active={status === null && decision === null}
              onClick={() => {
                setStatus(null);
                setDecision(null);
                setPage(1);
              }}
            />
            {STATUSES.map((s) => (
              <FilterChip
                key={s}
                label={EXAMINATION_STATUS[s].label}
                active={status === s}
                onClick={() => {
                  setStatus(status === s ? null : s);
                  setPage(1);
                }}
              />
            ))}
            <span className="mx-1 self-center text-border">|</span>
            {DECISIONS.map((d) => (
              <FilterChip
                key={d}
                label={FITNESS_DECISION[d].label}
                active={decision === d}
                onClick={() => {
                  setDecision(decision === d ? null : d);
                  setPage(1);
                }}
              />
            ))}
          </div>
        </div>
        {reports.isPending ? (
          <LoadingState title="Raporlar yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {reports.error ? (
          <ErrorState onRetry={() => void reports.refetch()} className="rounded-none border-0" />
        ) : null}
        {reports.data ? (
          reports.data.items.length === 0 && pending.rows.length === 0 ? (
            <EmptyState
              title={filtering ? 'Filtreye uygun rapor bulunamadı' : 'Rapor yok'}
              description={
                filtering
                  ? 'Arama alanlarını veya tarih aralığını değiştirin.'
                  : 'Bir protokol açıp raporunu başlatın.'
              }
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Muayene</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Tür / protokol</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Karar</TableHead>
                    <TableHead>Hekim</TableHead>
                    <TableHead>Sonraki</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <PendingProtocolRows
                    rows={pending.rows}
                    fill={1}
                    trailing={3}
                    statusLabel="Rapor bekleniyor"
                    action={(row) => (
                      <AppButton
                        size="sm"
                        variant="secondary"
                        loading={openReport.isPending && openReport.variables === row.id}
                        onClick={() =>
                          openReport.mutate(row.id, {
                            onSuccess: (report) => void navigate(reportPath(report.id)),
                            onError: (e) => toast.error('Rapor açılamadı', toApiError(e).message),
                          })
                        }
                      >
                        Raporu aç
                      </AppButton>
                    )}
                  />
                  {(work !== 'PENDING' || filtering) &&
                    reports.data.items.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => void navigate(reportPath(r.id))}
                      >
                        <TableCell className="whitespace-nowrap">
                          {r.performedAt ? (
                            formatDateTime(r.performedAt)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {r.reportDocumentId ? (
                            <FileCheck2
                              className="ml-2 inline size-3.5 text-success"
                              aria-label="PDF hazır"
                            />
                          ) : null}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <Link
                            to={patientPath(r.employee.id)}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.employee.firstName} {r.employee.lastName}
                          </Link>
                          <span className="block font-mono text-xs font-normal text-muted-foreground">
                            {maskNationalId(r.employee.nationalId)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {PROTOCOL_TYPE_LABELS[r.type]}
                          {r.protocol ? (
                            <span className="block font-mono text-xs text-muted-foreground">
                              {r.protocol.protocolNumber}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={EXAMINATION_STATUS[r.status].status}
                            label={EXAMINATION_STATUS[r.status].label}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={FITNESS_DECISION[r.fitnessDecision].status}
                            label={FITNESS_DECISION[r.fitnessDecision].label}
                          />
                        </TableCell>
                        <TableCell>
                          {r.physicianProfile
                            ? [
                                r.physicianProfile.title,
                                r.physicianProfile.firstName,
                                r.physicianProfile.lastName,
                              ]
                                .filter(Boolean)
                                .join(' ')
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(r.nextExaminationDue)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {work !== 'PENDING' || filtering ? (
                <Pagination meta={reports.data.meta} onPageChange={setPage} />
              ) : null}
            </>
          )
        ) : null}
      </div>
    </>
  );
}
