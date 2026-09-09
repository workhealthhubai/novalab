import { PERMISSIONS } from '@osgb/shared-types';
import { AlertTriangle, Download, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
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
import {
  formatDate,
  formatDateTime,
  maskNationalId,
  patientPath,
} from '@/features/patients/patient-utils';
import { protocolPath } from '@/features/protocols/protocol-utils';
import { SpirometryForm } from '@/features/spirometry/spirometry-form';
import { initialValues, toInput } from '@/features/spirometry/spirometry-form-values';
import {
  FLAG_LABELS,
  litres,
  PATTERN,
  percent,
  SMOKING_LABELS,
  spirometryPath,
} from '@/features/spirometry/spirometry-labels';
import {
  openTrace,
  useSpirometryHistory,
  useSpirometryMutations,
  useSpirometryTest,
} from '@/features/spirometry/use-spirometry';
import { toApiError } from '@/services/api-client';

function Row({
  label,
  measured,
  predicted,
  pct,
  flagged = false,
}: {
  label: string;
  measured: string;
  predicted?: string;
  pct?: string;
  flagged?: boolean;
}) {
  return (
    <tr className="border-t border-border">
      <th scope="row" className="py-1.5 pr-3 text-left font-medium">
        {label}
      </th>
      <td className={`py-1.5 pr-3 tabular-nums ${flagged ? 'font-medium text-warning' : ''}`}>
        {measured}
      </td>
      <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{predicted ?? '—'}</td>
      <td className={`py-1.5 tabular-nums ${flagged ? 'font-medium text-warning' : ''}`}>
        {pct ?? '—'}
      </td>
    </tr>
  );
}

export function SpirometryTestPage() {
  const { testId } = useParams<'testId'>();
  const navigate = useNavigate();
  const test = useSpirometryTest(testId);
  const t = test.data;
  const history = useSpirometryHistory(t?.employeeId);
  const { update, remove, attachTrace } = useSpirometryMutations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [opening, setOpening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (test.isPending) return <LoadingState title="Test yükleniyor…" />;
  if (test.error || !t) return <ErrorState onRetry={() => void test.refetch()} />;

  const a = t.analysis;
  const pattern = t.pattern ?? a.pattern;
  const title = `${t.employee.firstName} ${t.employee.lastName} · ${formatDate(t.performedAt)}`;
  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    attachTrace.mutate(
      { id: t.id, file },
      {
        onSuccess: () => toast.success('Çıktı eklendi'),
        onError: (e) => toast.error('Yüklenemedi', toApiError(e).message),
      },
    );
  };
  const open = async () => {
    setOpening(true);
    try {
      await openTrace(t.id);
    } catch (error) {
      toast.error('Çıktı açılamadı', toApiError(error).message);
    } finally {
      setOpening(false);
    }
  };

  if (editing) {
    return (
      <>
        <PageHeader
          title={`Testi düzenle · ${title}`}
          breadcrumbs={[
            { label: 'Doktor Modülü' },
            { label: 'Spirometri', to: PATHS.spirometry },
            { label: 'Düzenle' },
          ]}
        />
        <SpirometryForm
          initial={initialValues({
            patient: {
              ...t.employee,
              registrationNumber: null,
              phone: null,
              status: 'ACTIVE',
              identityVerificationStatus: 'UNVERIFIED',
              company: null,
            } as never,
            test: t,
          })}
          lockPatient
          submitLabel="Değişiklikleri Kaydet"
          pending={update.isPending}
          error={update.error}
          onCancel={() => setEditing(false)}
          onSubmit={(values) => {
            const { employeeId: _ignored, ...input } = toInput(values);
            update.mutate(
              { id: t.id, input },
              {
                onSuccess: () => {
                  toast.success('Test güncellendi');
                  setEditing(false);
                },
              },
            );
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        description={`${formatDateTime(t.performedAt)}${t.deviceName ? ` · ${t.deviceName}` : ''}${t.performedBy ? ` · ${t.performedBy.firstName} ${t.performedBy.lastName}` : ''}`}
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'Spirometri', to: PATHS.spirometry },
          { label: formatDate(t.performedAt) },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {pattern ? (
              <StatusBadge
                status={PATTERN[pattern].status}
                label={`${PATTERN[pattern].label}${a.severity && pattern !== 'NORMAL' ? ` · ${a.severity.label}` : ''}`}
                className="self-center"
              />
            ) : null}
            <Can permission={PERMISSIONS.SPIROMETRY_MANAGE}>
              <AppButton variant="secondary" onClick={() => setEditing(true)}>
                <Pencil />
                Düzenle
              </AppButton>
              <AppButton variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 />
                Sil
              </AppButton>
            </Can>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-4">
          <SectionCard
            title="Ölçümler"
            description={
              a.predicted.source === 'ecsc'
                ? 'Beklenen değerler boy, yaş ve cinsiyetten ECSC 1993 denklemleriyle hesaplandı.'
                : a.predicted.source === 'device'
                  ? 'Beklenen değerler cihaz raporundan.'
                  : 'Beklenen değer hesaplanamadı.'
            }
            actions={
              t.qualityGrade ? <Badge variant="neutral">Kalite {t.qualityGrade}</Badge> : null
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="pb-1 text-left font-semibold">Parametre</th>
                  <th className="pb-1 text-left font-semibold">Ölçülen</th>
                  <th className="pb-1 text-left font-semibold">Beklenen</th>
                  <th className="pb-1 text-left font-semibold">% beklenen</th>
                </tr>
              </thead>
              <tbody>
                <Row
                  label="FVC"
                  measured={litres(t.fvc)}
                  predicted={litres(a.predicted.fvc)}
                  pct={percent(a.fvcPercent)}
                  flagged={a.fvcPercent !== null && a.fvcPercent < 80}
                />
                <Row
                  label="FEV1"
                  measured={litres(t.fev1)}
                  predicted={litres(a.predicted.fev1)}
                  pct={percent(a.fev1Percent)}
                  flagged={a.fev1Percent !== null && a.fev1Percent < 80}
                />
                <Row
                  label={`FEV1/FVC${a.ratioSource === 'derived' ? ' (hesaplanan)' : ''}`}
                  measured={percent(a.ratio)}
                  predicted={a.predicted.ratio === null ? undefined : percent(a.predicted.ratio)}
                  flagged={a.ratio !== null && a.ratio < 70}
                />
                <Row
                  label="PEF"
                  measured={litres(t.pef, 'L/s')}
                  flagged={a.flags.includes('LOW_PEF')}
                />
                <Row label="FEF25–75" measured={litres(t.fef2575, 'L/s')} />
                {a.bronchodilator ? (
                  <Row
                    label="Post-BD FEV1"
                    measured={litres(t.postFev1)}
                    pct={`${a.bronchodilator.fev1GainMl >= 0 ? '+' : ''}${a.bronchodilator.fev1GainMl} mL · ${a.bronchodilator.fev1GainPercent >= 0 ? '+' : ''}%${a.bronchodilator.fev1GainPercent}`}
                    flagged={a.bronchodilator.positive}
                  />
                ) : null}
                {t.postFvc !== null ? (
                  <Row label="Post-BD FVC" measured={litres(t.postFvc)} />
                ) : null}
              </tbody>
            </table>
            {a.flags.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-1.5">
                {a.flags.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-4 text-warning" aria-hidden />
                    {FLAG_LABELS[f]}
                    {f === 'FEV1_DECLINE' && a.fev1DeclinePercent !== null ? (
                      <span className="text-muted-foreground">(%{a.fev1DeclinePercent})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Uyarı yok.</p>
            )}
            {t.baseline ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Başlangıç testi: {formatDate(t.baseline.performedAt)} (FEV1{' '}
                {litres(t.baseline.fev1)}); değişim{' '}
                {a.fev1DeclinePercent === null
                  ? '—'
                  : `${a.fev1DeclinePercent > 0 ? '−' : '+'}%${Math.abs(a.fev1DeclinePercent)}`}
                .
              </p>
            ) : null}
            {t.pattern && a.pattern && t.pattern !== a.pattern ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Otomatik patern {PATTERN[a.pattern].label}; hekim {PATTERN[t.pattern].label} olarak
                kaydetti.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Hekim yorumu">
            <p className="text-sm whitespace-pre-wrap">
              {t.comment || <span className="text-muted-foreground">Yorum yazılmadı.</span>}
            </p>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard
            title="Cihaz çıktısı"
            description="Akım-volüm eğrisi içeren cihaz raporu (PDF veya görüntü) tıbbi belge olarak saklanır."
            actions={
              <Can permission={PERMISSIONS.SPIROMETRY_MANAGE}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={pick}
                  aria-label="Spirometri çıktısı seç"
                />
                <AppButton
                  size="sm"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  loading={attachTrace.isPending}
                >
                  <Paperclip />
                  {t.document ? 'Çıktıyı değiştir' : 'Çıktı ekle'}
                </AppButton>
              </Can>
            }
          >
            {t.document ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{t.document.fileName}</span>
                <span className="text-xs text-muted-foreground">
                  {(t.document.sizeBytes / 1024).toFixed(0)} KB ·{' '}
                  {formatDateTime(t.document.createdAt)}
                </span>
                <AppButton size="sm" variant="ghost" onClick={() => void open()} loading={opening}>
                  <Download />
                  Aç
                </AppButton>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz çıktı eklenmedi.</p>
            )}
          </SectionCard>

          <SectionCard title="Hasta ve koşullar">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Hasta</dt>
                <dd>
                  <Link
                    to={patientPath(t.employee.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {t.employee.firstName} {t.employee.lastName}
                  </Link>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {maskNationalId(t.employee.nationalId)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Protokol</dt>
                <dd>
                  {t.protocol ? (
                    <Link
                      to={protocolPath(t.protocol.id)}
                      className="font-mono text-primary hover:underline"
                    >
                      {t.protocol.protocolNumber}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Boy / kilo</dt>
                <dd>
                  {t.heightCm === null ? '—' : `${t.heightCm} cm`} /{' '}
                  {t.weightKg === null ? '—' : `${t.weightKg} kg`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sigara</dt>
                <dd>{t.smokingStatus ? SMOKING_LABELS[t.smokingStatus] : '—'}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Geçmiş testler" description="FEV1 ve % beklenen, eski → yeni.">
            {history.data ? (
              history.data.length <= 1 ? (
                <p className="text-sm text-muted-foreground">
                  Bu hastanın başka spirometri testi yok.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {history.data.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                      {h.id === t.id ? (
                        <span className="font-medium">{formatDate(h.performedAt)} (bu test)</span>
                      ) : (
                        <Link
                          to={spirometryPath(h.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatDate(h.performedAt)}
                        </Link>
                      )}
                      {h.isBaseline ? <Badge variant="neutral">Başlangıç</Badge> : null}
                      <span className="tabular-nums">FEV1 {litres(h.fev1)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {percent(h.fev1Percent)} · FEV1/FVC {percent(h.ratio)}
                      </span>
                      {h.pattern ? (
                        <StatusBadge
                          status={PATTERN[h.pattern].status}
                          label={PATTERN[h.pattern].label}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Spirometri testi silinsin mi?"
        description="Test kaydı kaldırılır; FEV1 düşüşü hesapları bu testi artık dikkate almaz."
        confirmLabel="Sil"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(t.id, {
            onSuccess: () => {
              toast.success('Test silindi');
              void navigate(PATHS.spirometry, { replace: true });
            },
            onError: (e) => toast.error('Silinemedi', toApiError(e).message),
          })
        }
      />
    </>
  );
}
