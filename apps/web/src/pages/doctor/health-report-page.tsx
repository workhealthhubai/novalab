import { MEASUREMENT_DEFINITIONS, PERMISSIONS } from '@osgb/shared-types';
import { AlertTriangle, Download, FileSignature, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { SectionCard } from '@/design-system/section-card';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import { formatMeasurement } from '@/features/examinations/comparison-utils';
import { EXAMINATION_STATUS, FITNESS_DECISION } from '@/features/examinations/examination-labels';
import { MeasurementsDialog } from '@/features/examinations/measurements-dialog';
import { ReportEditor } from '@/features/health-reports/report-editor';
import { initialValues, toInput } from '@/features/health-reports/report-form-values';
import { BLOCKER_LABELS, TEST_MODULE_PATHS } from '@/features/health-reports/report-labels';
import {
  openReportPdf,
  useHealthReport,
  useHealthReportMutations,
} from '@/features/health-reports/use-health-reports';
import {
  formatDate,
  formatDateTime,
  maskNationalId,
  patientPath,
} from '@/features/patients/patient-utils';
import {
  PROTOCOL_ITEM_LABELS,
  PROTOCOL_ITEM_STATUS,
  PROTOCOL_TYPE_LABELS,
} from '@/features/protocols/protocol-labels';
import { protocolPath } from '@/features/protocols/protocol-utils';
import { toApiError } from '@/services/api-client';
import type { ComparedExamination } from '@/types/examination';

export function HealthReportPage() {
  const { examinationId } = useParams<'examinationId'>();
  const report = useHealthReport(examinationId);
  const r = report.data;
  const { update, approve } = useHealthReportMutations();
  const [measurementsOpen, setMeasurementsOpen] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [opening, setOpening] = useState(false);

  if (report.isPending) return <LoadingState title="Rapor yükleniyor…" />;
  if (report.error || !r) return <ErrorState onRetry={() => void report.refetch()} />;

  const approved = r.status === 'APPROVED';
  const title = `${r.employee.firstName} ${r.employee.lastName} · ${PROTOCOL_TYPE_LABELS[r.type]}`;
  const openPdf = async () => {
    setOpening(true);
    try {
      await openReportPdf(r.id);
    } catch (error) {
      toast.error('PDF açılamadı', toApiError(error).message);
    } finally {
      setOpening(false);
    }
  };
  const measured = MEASUREMENT_DEFINITIONS.filter((d) => r.measurements[d.key]);
  const asCompared: ComparedExamination = {
    id: r.id,
    type: r.type,
    status: r.status,
    scheduledAt: r.scheduledAt,
    performedAt: r.performedAt,
    createdAt: r.createdAt,
    date: r.performedAt ?? r.createdAt,
    fitnessDecision: r.fitnessDecision,
    restrictions: r.restrictions,
    findings: r.findings,
    conclusion: r.conclusion,
    nextExaminationDue: r.nextExaminationDue,
    approvedAt: r.approvedAt,
    protocol: r.protocol
      ? { id: r.protocol.id, protocolNumber: r.protocol.protocolNumber, items: r.protocol.items }
      : null,
    physician: null,
    approvedBy: r.approvedBy,
    measurements: r.measurements,
  };

  return (
    <>
      <PageHeader
        title={title}
        description={`${r.performedAt ? formatDateTime(r.performedAt) : 'Muayene tarihi girilmedi'}${r.protocol ? ` · Protokol ${r.protocol.protocolNumber}` : ''}${r.approvedAt ? ` · Onay ${formatDateTime(r.approvedAt)}` : ''}`}
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'Sağlık Raporları', to: PATHS.healthReports },
          { label: r.protocol?.protocolNumber ?? PROTOCOL_TYPE_LABELS[r.type] },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={EXAMINATION_STATUS[r.status].status}
              label={EXAMINATION_STATUS[r.status].label}
              className="self-center"
            />
            <StatusBadge
              status={FITNESS_DECISION[r.fitnessDecision].status}
              label={FITNESS_DECISION[r.fitnessDecision].label}
              className="self-center"
            />
            {r.reportDocumentId ? (
              <AppButton onClick={() => void openPdf()} loading={opening}>
                <Download />
                Rapor PDF
              </AppButton>
            ) : null}
            {!approved ? (
              <Can permission={PERMISSIONS.EXAMINATIONS_APPROVE}>
                <AppButton
                  variant="secondary"
                  onClick={() => setConfirmApprove(true)}
                  disabled={r.blockers.length > 0}
                  title={r.blockers.length > 0 ? 'Rapor henüz onaya hazır değil' : undefined}
                >
                  <FileSignature />
                  Onayla ve PDF Oluştur
                </AppButton>
              </Can>
            ) : null}
          </div>
        }
      />

      {r.blockers.length > 0 && !approved ? (
        <div
          className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2.5 text-sm"
          role="status"
        >
          <p className="mb-1 flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4 text-warning" aria-hidden />
            Onay için eksikler
          </p>
          <ul className="list-disc pl-6 text-muted-foreground">
            {r.blockers.map((b) => (
              <li key={b}>{BLOCKER_LABELS[b] ?? b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ReportEditor
          key={`${r.id}-${r.updatedAt}`}
          initial={initialValues(r)}
          readOnly={approved}
          pending={update.isPending}
          error={update.error}
          onSave={(values) =>
            update.mutate(
              { id: r.id, input: toInput(values) },
              { onSuccess: () => toast.success('Rapor kaydedildi') },
            )
          }
        />

        <div className="flex flex-col gap-4">
          <SectionCard title="Çalışan">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Ad Soyad</dt>
                <dd>
                  <Link
                    to={patientPath(r.employee.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.employee.firstName} {r.employee.lastName}
                  </Link>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {maskNationalId(r.employee.nationalId)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Doğum tarihi</dt>
                <dd>{formatDate(r.employee.birthDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">İşyeri</dt>
                <dd>{r.employee.company?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Meslek</dt>
                <dd>{r.employee.occupation?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">İşe giriş</dt>
                <dd>{formatDate(r.employee.hireDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Protokol</dt>
                <dd>
                  {r.protocol ? (
                    <Link
                      to={protocolPath(r.protocol.id)}
                      className="font-mono text-primary hover:underline"
                    >
                      {r.protocol.protocolNumber}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title="C. Vital bulgular ve ölçümler"
            actions={
              !approved ? (
                <Can permission={PERMISSIONS.EXAMINATIONS_UPDATE}>
                  <AppButton size="sm" variant="ghost" onClick={() => setMeasurementsOpen(true)}>
                    <Pencil />
                    Ölçümler
                  </AppButton>
                </Can>
              ) : null
            }
          >
            {measured.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ölçüm girilmemiş (boy, kilo, tansiyon, nabız…).
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {measured.map((d) => (
                  <div key={d.key}>
                    <dt className="text-xs text-muted-foreground">{d.label}</dt>
                    <dd className="tabular-nums">
                      {formatMeasurement(d.key, r.measurements[d.key]!.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </SectionCard>

          <SectionCard
            title="D. Tetkikler"
            description="Protokole bağlı test kayıtlarının özeti; rapora otomatik eklenir."
          >
            {r.tests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu protokolde kayıtlı tetkik yok.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border text-sm">
                {r.tests.map((t) => (
                  <li key={`${t.module}-${t.id}`} className="flex flex-wrap items-start gap-2 py-2">
                    <Link
                      to={TEST_MODULE_PATHS[t.module]?.(t.id) ?? '#'}
                      className="min-w-28 font-medium text-primary hover:underline"
                    >
                      {t.title}
                    </Link>
                    <span className="min-w-0 flex-1 text-muted-foreground">
                      {t.lines.join(' · ')}
                    </span>
                    {t.alert ? (
                      <Badge variant="neutral" className="border-warning text-warning">
                        Dikkat
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {r.protocol ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {r.protocol.items.map((item) => (
                  <li key={item.id}>
                    <StatusBadge
                      status={PROTOCOL_ITEM_STATUS[item.status].status}
                      label={`${PROTOCOL_ITEM_LABELS[item.type]}: ${PROTOCOL_ITEM_STATUS[item.status].label}`}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </SectionCard>

          {approved ? (
            <SectionCard title="Onay">
              <p className="text-sm">
                {r.approvedBy ? `${r.approvedBy.firstName} ${r.approvedBy.lastName}` : '—'} ·{' '}
                {r.approvedAt ? formatDateTime(r.approvedAt) : '—'}
              </p>
              {r.reportDocument ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.reportDocument.fileName} · {(r.reportDocument.sizeBytes / 1024).toFixed(0)} KB
                </p>
              ) : null}
            </SectionCard>
          ) : null}
        </div>
      </div>

      <MeasurementsDialog
        open={measurementsOpen}
        onOpenChange={setMeasurementsOpen}
        examination={asCompared}
        onSaved={() => toast.success('Ölçümler kaydedildi')}
      />
      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title="Rapor onaylansın mı?"
        description="Onaydan sonra rapor değiştirilemez; hekim imzalı PDF üretilir ve hastanın belgelerine eklenir."
        confirmLabel="Onayla"
        loading={approve.isPending}
        onConfirm={() =>
          approve.mutate(r.id, {
            onSuccess: () => {
              toast.success('Rapor onaylandı', 'PDF hazır');
              setConfirmApprove(false);
            },
            onError: (e) => toast.error('Onaylanamadı', toApiError(e).message),
          })
        }
      />
    </>
  );
}
