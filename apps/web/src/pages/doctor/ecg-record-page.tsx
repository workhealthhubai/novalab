import { ECG_FINDINGS, PERMISSIONS } from '@osgb/shared-types';
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
import { EcgForm } from '@/features/ecg/ecg-form';
import { initialValues, toInput } from '@/features/ecg/ecg-form-values';
import {
  ecgPath,
  FLAG_LABELS,
  fmt,
  INTERPRETATION,
  RHYTHM_LABELS,
} from '@/features/ecg/ecg-labels';
import { openTrace, useEcgHistory, useEcgMutations, useEcgRecord } from '@/features/ecg/use-ecg';
import {
  formatDate,
  formatDateTime,
  maskNationalId,
  patientPath,
} from '@/features/patients/patient-utils';
import { protocolPath } from '@/features/protocols/protocol-utils';
import { toApiError } from '@/services/api-client';

function Field({
  label,
  value,
  flagged = false,
}: {
  label: string;
  value: string;
  flagged?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={flagged ? 'font-medium text-warning tabular-nums' : 'tabular-nums'}>
        {value}
      </dd>
    </div>
  );
}

export function EcgRecordPage() {
  const { recordId } = useParams<'recordId'>();
  const navigate = useNavigate();
  const record = useEcgRecord(recordId);
  const r = record.data;
  const history = useEcgHistory(r?.employeeId);
  const { update, remove, attachTrace } = useEcgMutations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [opening, setOpening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (record.isPending) return <LoadingState title="Kayıt yükleniyor…" />;
  if (record.error || !r) return <ErrorState onRetry={() => void record.refetch()} />;

  const a = r.analysis;
  const title = `${r.employee.firstName} ${r.employee.lastName} · ${formatDate(r.performedAt)}`;
  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    attachTrace.mutate(
      { id: r.id, file },
      {
        onSuccess: () => toast.success('Çıktı eklendi'),
        onError: (e) => toast.error('Yüklenemedi', toApiError(e).message),
      },
    );
  };
  const open = async () => {
    setOpening(true);
    try {
      await openTrace(r.id);
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
          title={`Kaydı düzenle · ${title}`}
          breadcrumbs={[
            { label: 'Doktor Modülü' },
            { label: 'EKG', to: PATHS.ecg },
            { label: 'Düzenle' },
          ]}
        />
        <EcgForm
          initial={initialValues({
            patient: {
              ...r.employee,
              registrationNumber: null,
              phone: null,
              status: 'ACTIVE',
              identityVerificationStatus: 'UNVERIFIED',
              company: null,
            } as never,
            record: r,
          })}
          lockPatient
          submitLabel="Değişiklikleri Kaydet"
          pending={update.isPending}
          error={update.error}
          onCancel={() => setEditing(false)}
          onSubmit={(values) => {
            const { employeeId: _ignored, ...input } = toInput(values);
            update.mutate(
              { id: r.id, input },
              {
                onSuccess: () => {
                  toast.success('Kayıt güncellendi');
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
        description={`${formatDateTime(r.performedAt)}${r.deviceName ? ` · ${r.deviceName}` : ''}${r.performedBy ? ` · ${r.performedBy.firstName} ${r.performedBy.lastName}` : ''}`}
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'EKG', to: PATHS.ecg },
          { label: formatDate(r.performedAt) },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={INTERPRETATION[r.interpretation].status}
              label={INTERPRETATION[r.interpretation].label}
              className="self-center"
            />
            <Can permission={PERMISSIONS.ECG_MANAGE}>
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
              a.qtcSource === 'bazett'
                ? 'QTc, QT ve hızdan Bazett formülüyle hesaplandı.'
                : a.qtcSource === 'device'
                  ? 'QTc cihaz raporundan.'
                  : undefined
            }
          >
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <Field
                label="Kalp hızı"
                value={fmt(r.heartRate, '/dk')}
                flagged={a.flags.includes('BRADYCARDIA') || a.flags.includes('TACHYCARDIA')}
              />
              <Field
                label="Ritim"
                value={r.rhythm ? RHYTHM_LABELS[r.rhythm] : '—'}
                flagged={a.flags.includes('NON_SINUS_RHYTHM')}
              />
              <Field
                label="PR"
                value={fmt(r.prInterval, 'ms')}
                flagged={a.flags.includes('SHORT_PR') || a.flags.includes('LONG_PR')}
              />
              <Field
                label="QRS"
                value={fmt(r.qrsDuration, 'ms')}
                flagged={a.flags.includes('WIDE_QRS')}
              />
              <Field label="QT" value={fmt(r.qtInterval, 'ms')} />
              <Field
                label="QTc"
                value={fmt(a.qtc, 'ms')}
                flagged={a.flags.includes('LONG_QTC') || a.flags.includes('MARKEDLY_LONG_QTC')}
              />
              <Field
                label="Aks"
                value={r.axis === null ? '—' : `${r.axis}°`}
                flagged={a.flags.some((f) => f.endsWith('_AXIS'))}
              />
            </dl>
            {a.flags.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-1.5">
                {a.flags.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-4 text-warning" aria-hidden />
                    {FLAG_LABELS[f]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Ölçümler referans aralıklarında.</p>
            )}
            {r.interpretation !== a.suggested ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Otomatik öneri: {INTERPRETATION[a.suggested].label}; hekim yorumu{' '}
                {INTERPRETATION[r.interpretation].label.toLocaleLowerCase('tr-TR')} olarak
                kaydedildi.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Bulgular ve yorum">
            {r.findings.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {r.findings.map((code) => {
                  const def = ECG_FINDINGS.find((f) => f.code === code);
                  return (
                    <li key={code}>
                      <Badge variant="neutral">{def?.label ?? code}</Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Bulgu işaretlenmedi.</p>
            )}
            <p className="mt-3 text-sm whitespace-pre-wrap">
              {r.comment || <span className="text-muted-foreground">Hekim yorumu yazılmadı.</span>}
            </p>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard
            title="Cihaz çıktısı"
            description="PDF veya görüntü olarak eklenen EKG traseleri tıbbi belge olarak saklanır."
            actions={
              <Can permission={PERMISSIONS.ECG_MANAGE}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={pick}
                  aria-label="EKG çıktısı seç"
                />
                <AppButton
                  size="sm"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  loading={attachTrace.isPending}
                >
                  <Paperclip />
                  {r.document ? 'Çıktıyı değiştir' : 'Çıktı ekle'}
                </AppButton>
              </Can>
            }
          >
            {r.document ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{r.document.fileName}</span>
                <span className="text-xs text-muted-foreground">
                  {(r.document.sizeBytes / 1024).toFixed(0)} KB ·{' '}
                  {formatDateTime(r.document.createdAt)}
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

          <SectionCard title="Hasta ve protokol">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Hasta</dt>
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

          <SectionCard title="Geçmiş kayıtlar" description="Hız ve QTc, eski → yeni.">
            {history.data ? (
              history.data.length <= 1 ? (
                <p className="text-sm text-muted-foreground">Bu hastanın başka EKG kaydı yok.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {history.data.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                      {h.id === r.id ? (
                        <span className="font-medium">{formatDate(h.performedAt)} (bu kayıt)</span>
                      ) : (
                        <Link
                          to={ecgPath(h.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatDate(h.performedAt)}
                        </Link>
                      )}
                      <span className="tabular-nums">{fmt(h.heartRate, '/dk')}</span>
                      <span className="tabular-nums">QTc {fmt(h.qtc, 'ms')}</span>
                      <StatusBadge
                        status={INTERPRETATION[h.interpretation].status}
                        label={INTERPRETATION[h.interpretation].label}
                      />
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
        title="EKG kaydı silinsin mi?"
        description="Kayıt ve ekli çıktı bağlantısı kaldırılır."
        confirmLabel="Sil"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(r.id, {
            onSuccess: () => {
              toast.success('Kayıt silindi');
              void navigate(PATHS.ecg, { replace: true });
            },
            onError: (e) => toast.error('Silinemedi', toApiError(e).message),
          })
        }
      />
    </>
  );
}
