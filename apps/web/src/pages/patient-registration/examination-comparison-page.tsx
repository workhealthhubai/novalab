import { MEASUREMENT_DEFINITIONS, PERMISSIONS } from '@osgb/shared-types';
import { ArrowDown, ArrowUp, Pencil, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Can } from '@/components/can';
import { Checkbox } from '@/components/ui/checkbox';
import { AppButton } from '@/design-system/app-button';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { SectionCard } from '@/design-system/section-card';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import {
  flagOf,
  formatDelta,
  formatMeasurement,
  itemsProgress,
} from '@/features/examinations/comparison-utils';
import { EXAMINATION_STATUS, FITNESS_DECISION } from '@/features/examinations/examination-labels';
import { MeasurementsDialog } from '@/features/examinations/measurements-dialog';
import { Sparkline } from '@/features/examinations/sparkline';
import {
  useExaminationComparison,
  useExaminationTimeline,
} from '@/features/examinations/use-examinations';
import { formatDate, formatDateTime, patientPath } from '@/features/patients/patient-utils';
import { usePatient } from '@/features/patients/use-patients';
import { PatientPicker } from '@/features/protocols/patient-picker';
import { PROTOCOL_TYPE_LABELS } from '@/features/protocols/protocol-labels';
import { protocolPath } from '@/features/protocols/protocol-utils';
import { cn } from '@/lib/utils';
import type { ComparedExamination } from '@/types/examination';
import type { PatientListItem } from '@/types/patient';

const MAX_COLUMNS = 6;

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
  };
}

function TextCell({ value, changed }: { value: string | null; changed: boolean }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {changed ? (
        <span className="w-fit rounded-sm bg-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-warning">
          değişti
        </span>
      ) : null}
      <p className="scrollbar-subtle max-h-40 overflow-y-auto text-sm leading-5 whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}

export function ExaminationComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const [picked, setPicked] = useState<PatientListItem | null>(null);
  const preloaded = usePatient(!picked && patientIdParam ? patientIdParam : undefined);
  const patient = picked ?? (preloaded.data ? toListItem(preloaded.data) : null);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<ComparedExamination | null>(null);

  const timeline = useExaminationTimeline(patient?.id);
  const comparison = useExaminationComparison(patient?.id, selectedIds);
  const columns = comparison.data?.examinations ?? [];
  const effectiveIds = selectedIds ?? columns.map((c) => c.id);

  const choosePatient = (next: PatientListItem | null) => {
    setPicked(next);
    setSelectedIds(null);
    setSearchParams(next ? { patientId: next.id } : {}, { replace: true });
  };

  const toggle = (id: string) => {
    const next = effectiveIds.includes(id)
      ? effectiveIds.filter((x) => x !== id)
      : [...effectiveIds, id];
    if (next.length === 0) return;
    if (next.length > MAX_COLUMNS) {
      toast.error(`En fazla ${MAX_COLUMNS} muayene karşılaştırılabilir`);
      return;
    }
    setSelectedIds(next);
  };

  const groups = [
    ...new Set(
      MEASUREMENT_DEFINITIONS.filter((m) => comparison.data?.keys.includes(m.key)).map(
        (m) => m.group,
      ),
    ),
  ];

  return (
    <>
      <PageHeader
        title="Muayene Karşılaştırma"
        description="Bir hastanın muayenelerini yan yana görün: karar, kısıtlamalar, ölçümler ve bulgular; ölçümlerde referans aralığı dışı değerler ve değişimler işaretlenir."
        breadcrumbs={[{ label: 'Hasta Kayıt Kabul' }, { label: 'Muayene Karşılaştırma' }]}
      />

      <SectionCard title="Hasta" description="Muayeneleri karşılaştırılacak hastayı seçin.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <PatientPicker id="ec-patient" value={patient} onChange={choosePatient} />
          </div>
          {patient ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={patientPath(patient.id)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Hasta kartı
              </Link>
              <AppButton size="sm" variant="ghost" onClick={() => choosePatient(null)}>
                <X />
                Seçimi kaldır
              </AppButton>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {!patient ? (
        <EmptyState
          title="Hasta seçilmedi"
          description="Karşılaştırma için önce bir hasta seçin."
        />
      ) : (
        <>
          <SectionCard
            title="Muayeneler"
            description={`Karşılaştırmak istediğiniz muayeneleri işaretleyin (en fazla ${MAX_COLUMNS}). Varsayılan olarak son üç muayene gösterilir.`}
          >
            {timeline.isPending ? (
              <LoadingState title="Muayeneler yükleniyor…" className="min-h-24" />
            ) : null}
            {timeline.error ? <ErrorState onRetry={() => void timeline.refetch()} /> : null}
            {timeline.data ? (
              timeline.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Bu hastanın kayıtlı muayenesi yok. Muayeneler protokol açıldığında oluşur.
                </p>
              ) : (
                <ul className="scrollbar-subtle -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {timeline.data.map((e) => {
                    const checked = effectiveIds.includes(e.id);
                    return (
                      <li key={e.id}>
                        <label
                          className={cn(
                            'flex w-52 cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-sm transition-colors',
                            checked
                              ? 'border-primary bg-primary-soft/40'
                              : 'border-border hover:border-slate-300',
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggle(e.id)}
                              aria-label={`${formatDate(e.date)} ${PROTOCOL_TYPE_LABELS[e.type]}`}
                            />
                            <span className="font-medium text-foreground">
                              {formatDate(e.date)}
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {PROTOCOL_TYPE_LABELS[e.type]}
                            {e.protocol ? ` · ${e.protocol.protocolNumber}` : ''}
                          </span>
                          <span className="flex flex-wrap gap-1">
                            <StatusBadge
                              status={EXAMINATION_STATUS[e.status].status}
                              label={EXAMINATION_STATUS[e.status].label}
                            />
                            {e._count.measurements > 0 ? (
                              <span className="self-center text-[11px] text-muted-foreground">
                                {e._count.measurements} ölçüm
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : null}
          </SectionCard>

          {comparison.isPending ? (
            <LoadingState title="Karşılaştırma hazırlanıyor…" className="min-h-40" />
          ) : null}
          {comparison.error ? <ErrorState onRetry={() => void comparison.refetch()} /> : null}
          {comparison.data && columns.length > 0 ? (
            <div className="scrollbar-subtle overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 z-10 w-56 bg-card p-3 text-left text-xs font-semibold text-muted-foreground">
                      Alan
                    </th>
                    {columns.map((c) => (
                      <th key={c.id} className="min-w-52 p-3 text-left align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">
                            {formatDate(c.date)}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {PROTOCOL_TYPE_LABELS[c.type]}
                            {c.protocol ? (
                              <>
                                {' · '}
                                <Link
                                  to={protocolPath(c.protocol.id)}
                                  className="font-mono text-primary hover:underline"
                                >
                                  {c.protocol.protocolNumber}
                                </Link>
                              </>
                            ) : null}
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge
                              status={EXAMINATION_STATUS[c.status].status}
                              label={EXAMINATION_STATUS[c.status].label}
                            />
                            {c.status !== 'APPROVED' && c.status !== 'CANCELLED' ? (
                              <Can permission={PERMISSIONS.EXAMINATIONS_UPDATE}>
                                <AppButton
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`${formatDate(c.date)} ölçümlerini düzenle`}
                                  onClick={() => setEditing(c)}
                                >
                                  <Pencil />
                                  Ölçümler
                                </AppButton>
                              </Can>
                            ) : null}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label="Hekim">
                    {columns.map((c) => (
                      <Cell key={c.id}>
                        {c.physician ? `${c.physician.firstName} ${c.physician.lastName}` : '—'}
                      </Cell>
                    ))}
                  </Row>
                  <Row label="Çalışabilirlik kararı">
                    {columns.map((c) => (
                      <Cell key={c.id}>
                        <StatusBadge
                          status={FITNESS_DECISION[c.fitnessDecision].status}
                          label={FITNESS_DECISION[c.fitnessDecision].label}
                        />
                      </Cell>
                    ))}
                  </Row>
                  <Row label="Kısıtlamalar">
                    {columns.map((c, i) => (
                      <Cell key={c.id}>
                        <TextCell
                          value={c.restrictions}
                          changed={
                            i > 0 && (columns[i - 1]!.restrictions ?? '') !== (c.restrictions ?? '')
                          }
                        />
                      </Cell>
                    ))}
                  </Row>
                  <Row label="Sonraki muayene">
                    {columns.map((c) => (
                      <Cell key={c.id}>{formatDate(c.nextExaminationDue)}</Cell>
                    ))}
                  </Row>
                  <Row label="Protokol tetkikleri">
                    {columns.map((c) => {
                      const progress = c.protocol ? itemsProgress(c.protocol.items) : null;
                      return (
                        <Cell key={c.id}>
                          {progress ? `${progress.done} / ${progress.total} tamamlandı` : '—'}
                        </Cell>
                      );
                    })}
                  </Row>
                  <Row label="Onay">
                    {columns.map((c) => (
                      <Cell key={c.id}>
                        {c.approvedAt
                          ? `${formatDateTime(c.approvedAt)}${c.approvedBy ? ` · ${c.approvedBy.firstName} ${c.approvedBy.lastName}` : ''}`
                          : '—'}
                      </Cell>
                    ))}
                  </Row>

                  {groups.map((group) => (
                    <Fragment key={group}>
                      <tr className="border-t border-border bg-muted/40">
                        <th
                          colSpan={columns.length + 1}
                          className="sticky left-0 p-2 pl-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                        >
                          {group}
                        </th>
                      </tr>
                      {MEASUREMENT_DEFINITIONS.filter(
                        (m) => m.group === group && comparison.data?.keys.includes(m.key),
                      ).map((def) => {
                        const values = columns.map((c) => c.measurements[def.key]?.value);
                        return (
                          <Row
                            key={def.key}
                            label={
                              <span className="flex items-center justify-between gap-2">
                                <span>
                                  {def.label}
                                  {def.normal ? (
                                    <span className="block text-[11px] font-normal text-muted-foreground">
                                      ref. {def.normal.min !== undefined ? def.normal.min : ''}
                                      {def.normal.min !== undefined && def.normal.max !== undefined
                                        ? '–'
                                        : def.normal.min !== undefined
                                          ? ' ve üzeri'
                                          : ' altı'}
                                      {def.normal.max !== undefined
                                        ? `${def.normal.min === undefined ? ' ' : ''}${def.normal.max}`
                                        : ''}{' '}
                                      {def.unit}
                                    </span>
                                  ) : null}
                                </span>
                                <Sparkline measurementKey={def.key} values={values} />
                              </span>
                            }
                          >
                            {columns.map((c, i) => {
                              const value = values[i];
                              const flag = flagOf(def.key, value);
                              const delta = formatDelta(def.key, values[i - 1], value);
                              return (
                                <Cell key={c.id}>
                                  {value === undefined ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <span className="flex flex-wrap items-center gap-1.5 tabular-nums">
                                      <span
                                        className={cn(
                                          'font-medium',
                                          flag ? 'text-warning' : 'text-foreground',
                                        )}
                                      >
                                        {formatMeasurement(def.key, value)}
                                      </span>
                                      {flag ? (
                                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-warning">
                                          {flag === 'HIGH' ? (
                                            <ArrowUp className="size-3" />
                                          ) : (
                                            <ArrowDown className="size-3" />
                                          )}
                                          {flag === 'HIGH' ? 'yüksek' : 'düşük'}
                                        </span>
                                      ) : null}
                                      {delta ? (
                                        <span className="text-xs text-muted-foreground">
                                          ({delta})
                                        </span>
                                      ) : null}
                                    </span>
                                  )}
                                  {c.measurements[def.key]?.note ? (
                                    <span className="block text-xs text-muted-foreground">
                                      {c.measurements[def.key]!.note}
                                    </span>
                                  ) : null}
                                </Cell>
                              );
                            })}
                          </Row>
                        );
                      })}
                    </Fragment>
                  ))}
                  {groups.length === 0 ? (
                    <tr className="border-t border-border">
                      <td
                        colSpan={columns.length + 1}
                        className="p-3 text-sm text-muted-foreground"
                      >
                        Bu muayenelerde ölçüm girilmemiş. "Ölçümler" ile boy, kilo, tansiyon,
                        solunum ve laboratuvar değerlerini kaydedebilirsiniz.
                      </td>
                    </tr>
                  ) : null}

                  <tr className="border-t border-border bg-muted/40">
                    <th
                      colSpan={columns.length + 1}
                      className="sticky left-0 p-2 pl-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      Klinik
                    </th>
                  </tr>
                  <Row label="Bulgular">
                    {columns.map((c, i) => (
                      <Cell key={c.id}>
                        <TextCell
                          value={c.findings}
                          changed={i > 0 && (columns[i - 1]!.findings ?? '') !== (c.findings ?? '')}
                        />
                      </Cell>
                    ))}
                  </Row>
                  <Row label="Sonuç">
                    {columns.map((c, i) => (
                      <Cell key={c.id}>
                        <TextCell
                          value={c.conclusion}
                          changed={
                            i > 0 && (columns[i - 1]!.conclusion ?? '') !== (c.conclusion ?? '')
                          }
                        />
                      </Cell>
                    ))}
                  </Row>
                </tbody>
              </table>
            </div>
          ) : null}
          {comparison.data && columns.length === 1 ? (
            <p className="text-xs text-muted-foreground">
              Karşılaştırma için en az iki muayene seçin; şu an tek muayene gösteriliyor.
            </p>
          ) : null}
        </>
      )}

      <MeasurementsDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        examination={editing}
        onSaved={() => toast.success('Ölçümler kaydedildi')}
      />
    </>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <tr className="border-t border-border align-top">
      <th
        scope="row"
        className="sticky left-0 z-10 bg-card p-3 text-left text-sm font-medium text-foreground"
      >
        {label}
      </th>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="p-3 align-top">{children}</td>;
}
