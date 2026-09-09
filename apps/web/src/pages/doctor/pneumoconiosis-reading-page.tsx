import { LUNG_ZONE_LABELS, type LungZone, PERMISSIONS } from '@osgb/shared-types';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { PneumoconiosisForm } from '@/features/pneumoconiosis/pneumoconiosis-form';
import { initialValues, toInput } from '@/features/pneumoconiosis/pneumoconiosis-form-values';
import {
  FLAG_LABELS,
  LARGE_OPACITY_LABELS,
  readingPath,
  RESULT,
  SHAPE_LABELS,
  symbolLabel,
} from '@/features/pneumoconiosis/pneumoconiosis-labels';
import {
  usePneumoHistory,
  usePneumoMutations,
  usePneumoReading,
} from '@/features/pneumoconiosis/use-pneumoconiosis';
import { protocolPath } from '@/features/protocols/protocol-utils';
import { requestPath } from '@/features/radiology/radiology-utils';
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
      <dd className={flagged ? 'font-medium text-warning' : ''}>{value}</dd>
    </div>
  );
}

export function PneumoconiosisReadingPage() {
  const { readingId } = useParams<'readingId'>();
  const navigate = useNavigate();
  const reading = usePneumoReading(readingId);
  const r = reading.data;
  const history = usePneumoHistory(r?.employeeId);
  const { update, remove } = usePneumoMutations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (reading.isPending) return <LoadingState title="Okuma yükleniyor…" />;
  if (reading.error || !r) return <ErrorState onRetry={() => void reading.refetch()} />;

  const a = r.analysis;
  const title = `${r.employee.firstName} ${r.employee.lastName} · ${formatDate(r.readAt)}`;

  if (editing) {
    return (
      <>
        <PageHeader
          title={`Okumayı düzenle · ${title}`}
          breadcrumbs={[
            { label: 'Doktor Modülü' },
            { label: 'Pnömokonyoz', to: PATHS.pneumoconiosis },
            { label: 'Düzenle' },
          ]}
        />
        <PneumoconiosisForm
          initial={initialValues({
            patient: {
              ...r.employee,
              registrationNumber: null,
              phone: null,
              status: 'ACTIVE',
              identityVerificationStatus: 'UNVERIFIED',
              company: null,
            } as never,
            reading: r,
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
                  toast.success('Okuma güncellendi');
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
        description={`${formatDateTime(r.readAt)}${r.reader ? ` · ${r.reader.firstName} ${r.reader.lastName}` : ''}${r.readerRole ? ` (${r.readerRole})` : ''}${r.filmDate ? ` · Film ${formatDate(r.filmDate)}` : ''}`}
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'Pnömokonyoz', to: PATHS.pneumoconiosis },
          { label: formatDate(r.readAt) },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={RESULT[r.result].status}
              label={RESULT[r.result].label}
              className="self-center"
            />
            <Can permission={PERMISSIONS.PNEUMOCONIOSIS_MANAGE}>
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
            title="ILO sınıflaması"
            actions={
              r.filmQuality ? <Badge variant="neutral">Film kalitesi {r.filmQuality}</Badge> : null
            }
          >
            {r.filmQuality === 4 ? (
              <p className="text-sm text-warning">
                Film kabul edilemez kalitede; sınıflama yapılmadı. {r.qualityComment ?? ''}
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                <Field
                  label="Profüzyon"
                  value={r.profusion ?? '—'}
                  flagged={a.flags.includes('SMALL_OPACITIES')}
                />
                <Field
                  label="Kategori"
                  value={a.category === null ? '—' : String(a.category)}
                  flagged={a.flags.includes('SMALL_OPACITIES')}
                />
                <Field
                  label="Şekil / boyut"
                  value={
                    r.shapePrimary
                      ? `${SHAPE_LABELS[r.shapePrimary] ?? r.shapePrimary}${r.shapeSecondary ? ` · ${SHAPE_LABELS[r.shapeSecondary] ?? r.shapeSecondary}` : ''}`
                      : '—'
                  }
                />
                <Field
                  label="Tutulan zonlar"
                  value={
                    r.zones.length > 0
                      ? r.zones.map((z) => LUNG_ZONE_LABELS[z as LungZone] ?? z).join(', ')
                      : '—'
                  }
                />
                <Field
                  label="Büyük opasite"
                  value={LARGE_OPACITY_LABELS[r.largeOpacity] ?? r.largeOpacity}
                  flagged={a.flags.includes('LARGE_OPACITIES')}
                />
                <Field label="Kalite kusuru" value={r.qualityComment ?? '—'} />
              </dl>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field
                label="Plevral plak"
                value={
                  r.pleuralPlaques ? `Var${r.plaqueCalcification ? ', kalsifiye' : ''}` : 'Yok'
                }
                flagged={r.pleuralPlaques}
              />
              <Field
                label="Diffüz kalınlaşma"
                value={r.diffuseThickening ? 'Var' : 'Yok'}
                flagged={r.diffuseThickening}
              />
              <Field
                label="Sinüs küntleşmesi"
                value={
                  r.costophrenicObliteration.length > 0
                    ? r.costophrenicObliteration.map((s) => (s === 'R' ? 'Sağ' : 'Sol')).join(', ')
                    : 'Yok'
                }
                flagged={r.costophrenicObliteration.length > 0}
              />
            </dl>
            {r.symbols.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {r.symbols.map((code) => (
                  <li key={code}>
                    <Badge
                      variant="neutral"
                      className={
                        a.alertSymbols.includes(code) ? 'border-warning text-warning' : undefined
                      }
                    >
                      {symbolLabel(code)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
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
              <p className="mt-4 text-sm text-muted-foreground">Uyarı yok.</p>
            )}
            {r.previous ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Önceki film: {formatDate(r.previous.filmDate ?? r.previous.readAt)} · profüzyon{' '}
                {r.previous.profusion ?? '—'}
                {a.previousCategory !== null && a.category !== null
                  ? ` (kategori ${a.previousCategory} → ${a.category})`
                  : ''}
              </p>
            ) : null}
            {r.result !== a.suggested ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Otomatik sonuç {RESULT[a.suggested].label}; okuyucu {RESULT[r.result].label} olarak
                kaydetti.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Okuyucu yorumu">
            <p className="text-sm whitespace-pre-wrap">
              {r.comment || <span className="text-muted-foreground">Yorum yazılmadı.</span>}
            </p>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title="Hasta, film ve protokol">
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
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Radyoloji isteği</dt>
                <dd>
                  {r.radiologyRequest ? (
                    <Link
                      to={requestPath(r.radiologyRequest.id)}
                      className="text-primary hover:underline"
                    >
                      {formatDateTime(r.radiologyRequest.requestedAt)} ·{' '}
                      {r.radiologyRequest.modality} {r.radiologyRequest.bodyPart ?? ''}
                      {r.radiologyRequest.studyInstanceUid ? ' · PACS' : ''}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Geçmiş okumalar" description="Profüzyon ve sonuç, eski → yeni.">
            {history.data ? (
              history.data.length <= 1 ? (
                <p className="text-sm text-muted-foreground">Bu hastanın başka ILO okuması yok.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {history.data.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                      {h.id === r.id ? (
                        <span className="font-medium">{formatDate(h.readAt)} (bu okuma)</span>
                      ) : (
                        <Link
                          to={readingPath(h.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatDate(h.readAt)}
                        </Link>
                      )}
                      <span className="font-mono">{h.profusion ?? '—'}</span>
                      {h.largeOpacity !== '0' ? (
                        <Badge variant="neutral">Büyük {h.largeOpacity}</Badge>
                      ) : null}
                      <StatusBadge
                        status={RESULT[h.result].status}
                        label={RESULT[h.result].label}
                      />
                      {h.readerRole ? (
                        <span className="text-xs text-muted-foreground">{h.readerRole}</span>
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
        title="ILO okuması silinsin mi?"
        description="Okuma kaydı kaldırılır; ilerleme karşılaştırmaları bu okumayı artık dikkate almaz."
        confirmLabel="Sil"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(r.id, {
            onSuccess: () => {
              toast.success('Okuma silindi');
              void navigate(PATHS.pneumoconiosis, { replace: true });
            },
            onError: (e) => toast.error('Silinemedi', toApiError(e).message),
          })
        }
      />
    </>
  );
}
