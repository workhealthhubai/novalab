import { PERMISSIONS } from '@osgb/shared-types';
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
import { EyeForm } from '@/features/eye/eye-form';
import { initialValues, toInput } from '@/features/eye/eye-form-values';
import {
  acuity,
  COLOR_VISION_LABELS,
  eyePath,
  FLAG_LABELS,
  jaeger,
  RECOMMENDATION,
  VISUAL_FIELD_LABELS,
} from '@/features/eye/eye-labels';
import { useEyeExamination, useEyeHistory, useEyeMutations } from '@/features/eye/use-eye';
import {
  formatDate,
  formatDateTime,
  maskNationalId,
  patientPath,
} from '@/features/patients/patient-utils';
import { protocolPath } from '@/features/protocols/protocol-utils';
import { toApiError } from '@/services/api-client';

export function EyeExaminationPage() {
  const { examId } = useParams<'examId'>();
  const navigate = useNavigate();
  const exam = useEyeExamination(examId);
  const e = exam.data;
  const history = useEyeHistory(e?.employeeId);
  const { update, remove } = useEyeMutations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (exam.isPending) return <LoadingState title="Muayene yükleniyor…" />;
  if (exam.error || !e) return <ErrorState onRetry={() => void exam.refetch()} />;

  const a = e.analysis;
  const title = `${e.employee.firstName} ${e.employee.lastName} · ${formatDate(e.performedAt)}`;
  const low = (side: 'RIGHT' | 'LEFT') =>
    a.flags.includes(side === 'RIGHT' ? 'LOW_ACUITY_RIGHT' : 'LOW_ACUITY_LEFT');

  if (editing) {
    return (
      <>
        <PageHeader
          title={`Muayeneyi düzenle · ${title}`}
          breadcrumbs={[
            { label: 'Doktor Modülü' },
            { label: 'Göz', to: PATHS.eye },
            { label: 'Düzenle' },
          ]}
        />
        <EyeForm
          initial={initialValues({
            patient: {
              ...e.employee,
              registrationNumber: null,
              phone: null,
              status: 'ACTIVE',
              identityVerificationStatus: 'UNVERIFIED',
              company: null,
            } as never,
            exam: e,
          })}
          lockPatient
          submitLabel="Değişiklikleri Kaydet"
          pending={update.isPending}
          error={update.error}
          onCancel={() => setEditing(false)}
          onSubmit={(values) => {
            const { employeeId: _ignored, ...input } = toInput(values);
            update.mutate(
              { id: e.id, input },
              {
                onSuccess: () => {
                  toast.success('Muayene güncellendi');
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
        description={`${formatDateTime(e.performedAt)}${e.performedBy ? ` · ${e.performedBy.firstName} ${e.performedBy.lastName}` : ''}`}
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'Göz', to: PATHS.eye },
          { label: formatDate(e.performedAt) },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={RECOMMENDATION[e.recommendation].status}
              label={RECOMMENDATION[e.recommendation].label}
              className="self-center"
            />
            <Can permission={PERMISSIONS.EYE_MANAGE}>
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
            title="Görme keskinliği"
            actions={
              <span className="flex gap-1.5">
                {e.usesGlasses ? <Badge variant="neutral">Gözlük</Badge> : null}
                {e.usesContactLenses ? <Badge variant="neutral">Kontakt lens</Badge> : null}
              </span>
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="pb-1 text-left font-semibold"></th>
                  <th className="pb-1 text-left font-semibold">Sağ</th>
                  <th className="pb-1 text-left font-semibold">Sol</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                    Uzak (düzeltmesiz)
                  </th>
                  <td className="py-1.5 pr-3 tabular-nums">{acuity(e.farRight)}</td>
                  <td className="py-1.5 tabular-nums">{acuity(e.farLeft)}</td>
                </tr>
                {e.farRightCorrected !== null || e.farLeftCorrected !== null ? (
                  <tr className="border-t border-border">
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                      Uzak (düzeltmeli)
                    </th>
                    <td className="py-1.5 pr-3 tabular-nums">{acuity(e.farRightCorrected)}</td>
                    <td className="py-1.5 tabular-nums">{acuity(e.farLeftCorrected)}</td>
                  </tr>
                ) : null}
                <tr className="border-t border-border">
                  <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                    En iyi uzak
                  </th>
                  <td
                    className={`py-1.5 pr-3 tabular-nums ${low('RIGHT') ? 'font-medium text-warning' : ''}`}
                  >
                    {acuity(a.bestRight)}
                  </td>
                  <td
                    className={`py-1.5 tabular-nums ${low('LEFT') ? 'font-medium text-warning' : ''}`}
                  >
                    {acuity(a.bestLeft)}
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                    Yakın
                  </th>
                  <td className="py-1.5 pr-3 tabular-nums">{jaeger(e.nearRight)}</td>
                  <td className="py-1.5 tabular-nums">{jaeger(e.nearLeft)}</td>
                </tr>
              </tbody>
            </table>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Renk görme</dt>
                <dd className={a.colorVision === 'DEFICIENT' ? 'font-medium text-warning' : ''}>
                  {COLOR_VISION_LABELS[a.colorVision]}
                  {e.ishiharaCorrect !== null && e.ishiharaTotal ? (
                    <span className="ml-1 text-muted-foreground">
                      (İshihara {e.ishiharaCorrect}/{e.ishiharaTotal})
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Görme alanı</dt>
                <dd className={e.visualField === 'ABNORMAL' ? 'font-medium text-warning' : ''}>
                  {VISUAL_FIELD_LABELS[e.visualField]}
                </dd>
              </div>
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
              <p className="mt-4 text-sm text-muted-foreground">Uyarı yok.</p>
            )}
            {e.recommendation !== a.suggested ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Otomatik öneri {RECOMMENDATION[a.suggested].label}; hekim{' '}
                {RECOMMENDATION[e.recommendation].label} olarak kaydetti.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Bulgular ve yorum">
            <p className="text-sm whitespace-pre-wrap">
              {e.findings || (
                <span className="text-muted-foreground">Dış göz bulgusu yazılmadı.</span>
              )}
            </p>
            <p className="mt-3 text-sm whitespace-pre-wrap">
              {e.comment || <span className="text-muted-foreground">Hekim yorumu yazılmadı.</span>}
            </p>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title="Hasta ve protokol">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Hasta</dt>
                <dd>
                  <Link
                    to={patientPath(e.employee.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {e.employee.firstName} {e.employee.lastName}
                  </Link>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {maskNationalId(e.employee.nationalId)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Protokol</dt>
                <dd>
                  {e.protocol ? (
                    <Link
                      to={protocolPath(e.protocol.id)}
                      className="font-mono text-primary hover:underline"
                    >
                      {e.protocol.protocolNumber}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Geçmiş muayeneler" description="En iyi uzak görme, eski → yeni.">
            {history.data ? (
              history.data.length <= 1 ? (
                <p className="text-sm text-muted-foreground">
                  Bu hastanın başka göz muayenesi yok.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {history.data.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                      {h.id === e.id ? (
                        <span className="font-medium">
                          {formatDate(h.performedAt)} (bu muayene)
                        </span>
                      ) : (
                        <Link
                          to={eyePath(h.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatDate(h.performedAt)}
                        </Link>
                      )}
                      <span className="tabular-nums">Sağ {acuity(h.bestRight)}</span>
                      <span className="tabular-nums">Sol {acuity(h.bestLeft)}</span>
                      <StatusBadge
                        status={RECOMMENDATION[h.recommendation].status}
                        label={RECOMMENDATION[h.recommendation].label}
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
        title="Göz muayenesi silinsin mi?"
        description="Muayene kaydı kaldırılır."
        confirmLabel="Sil"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(e.id, {
            onSuccess: () => {
              toast.success('Muayene silindi');
              void navigate(PATHS.eye, { replace: true });
            },
            onError: (err) => toast.error('Silinemedi', toApiError(err).message),
          })
        }
      />
    </>
  );
}
