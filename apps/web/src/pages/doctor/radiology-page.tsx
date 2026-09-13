import { PERMISSIONS } from '@osgb/shared-types';
import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
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
import { SectionCard } from '@/design-system/section-card';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import { formatDateTime, maskNationalId, patientPath } from '@/features/patients/patient-utils';
import { NewRequestDialog } from '@/features/radiology/new-request-dialog';
import {
  RadiologyFilters,
  type RadiologyFilterValues,
} from '@/features/radiology/radiology-filters';
import { MODALITY_LABELS, RADIOLOGY_STATUS } from '@/features/radiology/radiology-labels';
import { requestPath } from '@/features/radiology/radiology-utils';
import { StudyCard } from '@/features/radiology/study-card';
import {
  usePacsOperationsStatus,
  useRadiologyMutations,
  useRadiologyRequests,
  useReconcilePacs,
  useUnlinkedStudies,
} from '@/features/radiology/use-radiology';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import { toApiError } from '@/services/api-client';
import type { StudySummary } from '@/types/radiology';
import { usePatient } from '@/features/patients/use-patients';
import type { PatientListItem } from '@/types/patient';
import { PendingProtocolRows, WorkStatusChips } from '@/features/protocols/pending-rows';
import { usePendingProtocols, type WorkStatus } from '@/features/protocols/use-protocols';

function toListItem(p: NonNullable<ReturnType<typeof usePatient>['data']>): PatientListItem {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    nationalId: p.nationalId,
    registrationNumber: p.registrationNumber,
    phone: p.phone,
    birthDate: p.birthDate,
    status: p.status,
    identityVerificationStatus: p.identityVerificationStatus,
    company: p.company,
    gender: p.gender,
  };
}

export function RadiologyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const { can } = usePermissions();
  const [filters, setFilters] = useState<RadiologyFilterValues>({
    search: '',
    status: null,
    modality: null,
    range: { from: '', to: '' },
  });
  const [page, setPage] = useState(1);
  const [work, setWork] = useState<WorkStatus>('ALL');
  const pending = usePendingProtocols('RADIOLOGY', work, can(PERMISSIONS.RADIOLOGY_CREATE));
  const [dialog, setDialog] = useState<{
    open: boolean;
    study: StudySummary | null;
    patient: PatientListItem | null;
  }>({ open: false, study: null, patient: null });
  // `?patientId=…&new=1` (from the patient card / protocol page) opens the request dialog for that patient.
  const preselected = usePatient(
    searchParams.get('new') === '1' && patientId ? patientId : undefined,
  );
  const [autoOpened, setAutoOpened] = useState(false);
  if (preselected.data && !autoOpened) {
    setAutoOpened(true);
    setDialog({ open: true, study: null, patient: toListItem(preselected.data) });
  }
  const debouncedSearch = useDebouncedValue(filters.search.trim(), 350);

  const requests = useRadiologyRequests({
    page,
    pageSize: 20,
    ...(patientId ? { employeeId: patientId } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.modality ? { modality: filters.modality } : {}),
    ...(filters.range.from ? { from: filters.range.from } : {}),
    ...(filters.range.to ? { to: filters.range.to } : {}),
  });
  const unlinked = useUnlinkedStudies(can(PERMISSIONS.RADIOLOGY_READ));
  const pacs = usePacsOperationsStatus(can(PERMISSIONS.RADIOLOGY_READ));
  const reconcile = useReconcilePacs();
  const { retryWorklist } = useRadiologyMutations();

  return (
    <>
      <PageHeader
        title="Radyoloji"
        description="Radyoloji istekleri, PACS'tan gelen çalışmaların isteklere bağlanması, görüntüleme ve raporlama."
        breadcrumbs={[{ label: 'Doktor Modülü' }, { label: 'Radyoloji' }]}
        actions={
          <Can permission={PERMISSIONS.RADIOLOGY_CREATE}>
            <AppButton onClick={() => setDialog({ open: true, study: null, patient: null })}>
              <Plus />
              Yeni İstek
            </AppButton>
          </Can>
        }
      />

      <SectionCard
        title="PACS ve cihaz bağlantısı"
        description="Orthanc bağlantısı, DICOM iş listesi ve arka plan eşleştirme özeti."
        actions={
          <div className="flex items-center gap-2">
            {pacs.data ? (
              <StatusBadge
                status={pacs.data.connection === 'ONLINE' ? 'completed' : 'cancelled'}
                label={pacs.data.connection === 'ONLINE' ? 'PACS çevrimiçi' : 'PACS çevrimdışı'}
              />
            ) : null}
            <AppButton
              size="sm"
              variant="ghost"
              onClick={() => void pacs.refetch()}
              disabled={pacs.isFetching}
              aria-label="PACS durumunu yenile"
            >
              <RefreshCw />
              Yenile
            </AppButton>
          </div>
        }
      >
        {pacs.isPending ? (
          <LoadingState title="PACS durumu kontrol ediliyor…" className="min-h-20" />
        ) : null}
        {pacs.error ? (
          <ErrorState
            title="PACS durumu alınamadı"
            description={toApiError(pacs.error).message}
            onRetry={() => void pacs.refetch()}
          />
        ) : null}
        {pacs.data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PacsMetric label="Cihaz AE Title" value={pacs.data.stationAet ?? 'Ayarlanmadı'} />
            <PacsMetric label="Worklist'te" value={pacs.data.publishedWorklists} />
            <PacsMetric label="Görüntü bekleyen" value={pacs.data.awaitingStudy} />
            <PacsMetric label="Bugün tamamlanan" value={pacs.data.completedToday} />
            <PacsMetric label="İşlemde" value={pacs.data.pendingWorklists} />
            <PacsMetric
              label="Başarısız"
              value={pacs.data.failedWorklists}
              warning={pacs.data.failedWorklists > 0}
            />
            <PacsMetric
              label="Denemesi tükenen"
              value={pacs.data.exhaustedWorklists}
              warning={pacs.data.exhaustedWorklists > 0}
            />
            <PacsMetric
              label="Son worklist işlemi"
              value={
                pacs.data.lastWorklistSyncAt
                  ? formatDateTime(pacs.data.lastWorklistSyncAt)
                  : 'Henüz yok'
              }
            />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="PACS'tan gelen, bağlanmamış çalışmalar"
        description="Cihazdan aktarılan ancak henüz bir isteğe bağlanmamış görüntüler."
        actions={
          <div className="flex gap-2">
            <Can permission={PERMISSIONS.RADIOLOGY_CREATE}>
              <AppButton
                size="sm"
                variant="secondary"
                loading={reconcile.isPending}
                onClick={() =>
                  reconcile.mutate(undefined, {
                    onSuccess: (result) =>
                      toast.success(
                        'PACS eşleştirme tamamlandı',
                        `${result.linked} çalışma bağlandı, ${result.waiting} çalışma bekliyor.`,
                      ),
                    onError: (error) =>
                      toast.error('PACS eşleştirilemedi', toApiError(error).message),
                  })
                }
              >
                Otomatik eşleştir
              </AppButton>
            </Can>
            <AppButton
              size="sm"
              variant="ghost"
              onClick={() => void unlinked.refetch()}
              disabled={unlinked.isFetching}
              aria-label="PACS listesini yenile"
            >
              <RefreshCw />
              Yenile
            </AppButton>
          </div>
        }
      >
        {unlinked.isPending ? (
          <LoadingState title="PACS sorgulanıyor…" className="min-h-20" />
        ) : null}
        {unlinked.error ? (
          <ErrorState
            title="PACS'a ulaşılamadı"
            description={toApiError(unlinked.error).message}
            onRetry={() => void unlinked.refetch()}
          />
        ) : null}
        {unlinked.data ? (
          unlinked.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bağlanmamış çalışma yok.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {unlinked.data.map((s) => (
                <StudyCard
                  key={s.orthancStudyId}
                  study={s}
                  actionLabel={can(PERMISSIONS.RADIOLOGY_CREATE) ? 'Eşleşen isteği aç' : undefined}
                  onAction={() => void navigate(requestPath(s.requestId))}
                />
              ))}
            </ul>
          )
        ) : null}
      </SectionCard>

      <div className="rounded-xl border border-border bg-card">
        <div
          role="group"
          aria-label="İş durumu"
          className="scrollbar-none flex gap-1.5 overflow-x-auto border-b border-border px-3 pt-3 pb-1 sm:flex-wrap"
        >
          <WorkStatusChips
            value={work}
            onChange={(v) => {
              setWork(v);
              setPage(1);
            }}
            pendingCount={pending.total}
          />
        </div>
        <RadiologyFilters
          value={filters}
          onChange={(v) => {
            setFilters(v);
            setPage(1);
          }}
        />
        {requests.isPending ? (
          <LoadingState title="İstekler yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {requests.error ? (
          <ErrorState onRetry={() => void requests.refetch()} className="rounded-none border-0" />
        ) : null}
        {requests.data ? (
          requests.data.items.length === 0 && pending.rows.length === 0 ? (
            <EmptyState
              title="Radyoloji isteği yok"
              description='"Yeni İstek" ile oluşturun veya PACS listesinden bağlayın.'
              className="rounded-none border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İstek tarihi</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Modalite / bölge</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İş listesi</TableHead>
                    <TableHead>PACS</TableHead>
                    <TableHead>Rapor</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <PendingProtocolRows
                    rows={pending.rows}
                    fill={1}
                    trailing={3}
                    statusLabel="İstek bekleniyor"
                    action={(row) => (
                      <AppButton
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setDialog({
                            open: true,
                            study: null,
                            patient: {
                              ...row.employee,
                              registrationNumber: null,
                              phone: null,
                              status: 'ACTIVE',
                              identityVerificationStatus: 'UNVERIFIED',
                              company: row.company,
                            } as PatientListItem,
                          })
                        }
                      >
                        İstek oluştur
                      </AppButton>
                    )}
                  />
                  {work !== 'PENDING' &&
                    requests.data.items.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => void navigate(requestPath(r.id))}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(r.requestedAt)}
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
                          <Badge variant="neutral">{r.modality}</Badge>
                          <span
                            className="ml-2 text-muted-foreground"
                            title={MODALITY_LABELS[r.modality]}
                          >
                            {r.bodyPart ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={RADIOLOGY_STATUS[r.status].status}
                            label={RADIOLOGY_STATUS[r.status].label}
                          />
                        </TableCell>
                        <TableCell>
                          <WorklistStatusBadge
                            status={r.worklistStatus}
                            attempts={r.worklistAttemptCount}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.studyInstanceUid ? 'Bağlı' : 'Bekliyor'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.reportedAt ? formatDateTime(r.reportedAt) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {!r.studyInstanceUid &&
                            (r.worklistStatus === 'FAILED' ||
                              r.worklistStatus === 'NOT_CONFIGURED') ? (
                              <AppButton
                                size="sm"
                                variant="secondary"
                                loading={retryWorklist.isPending}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  retryWorklist.mutate(r.id, {
                                    onSuccess: () => toast.success('İş listesi yeniden yayınlandı'),
                                    onError: (error) =>
                                      toast.error(
                                        'İş listesi yayınlanamadı',
                                        toApiError(error).message,
                                      ),
                                  });
                                }}
                              >
                                Tekrar dene
                              </AppButton>
                            ) : null}
                            <AppButton size="sm" variant="ghost" asChild>
                              <Link to={requestPath(r.id)} onClick={(e) => e.stopPropagation()}>
                                Aç
                              </Link>
                            </AppButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {work !== 'PENDING' ? (
                <Pagination meta={requests.data.meta} onPageChange={setPage} />
              ) : null}
            </>
          )
        ) : null}
      </div>

      <NewRequestDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        study={dialog.study}
        patient={dialog.patient}
        onCreated={(r) => {
          toast.success('İstek oluşturuldu', r.studyInstanceUid ? 'Çalışma bağlandı' : undefined);
          void navigate(requestPath(r.id));
        }}
      />
    </>
  );
}

function PacsMetric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={warning ? 'mt-1 font-semibold text-destructive' : 'mt-1 font-semibold'}>
        {value}
      </p>
    </div>
  );
}

function WorklistStatusBadge({
  status,
  attempts,
}: {
  status: 'NOT_CONFIGURED' | 'PENDING' | 'PUBLISHED' | 'FAILED' | 'REMOVED';
  attempts: number;
}) {
  const values = {
    NOT_CONFIGURED: { status: 'waiting' as const, label: 'Ayarlanmadı' },
    PENDING: { status: 'processing' as const, label: 'Gönderiliyor' },
    PUBLISHED: { status: 'completed' as const, label: 'Yayında' },
    FAILED: { status: 'cancelled' as const, label: `Hata · ${attempts}. deneme` },
    REMOVED: { status: 'completed' as const, label: 'Tamamlandı' },
  };
  return <StatusBadge {...values[status]} />;
}
