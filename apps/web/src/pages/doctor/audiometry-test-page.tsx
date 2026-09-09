import { PERMISSIONS } from '@osgb/shared-types';
import { Pencil, Trash2 } from 'lucide-react';
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
import { toast } from '@/design-system/toast';
import { AnalysisPanel } from '@/features/audiometry/analysis-panel';
import { AudiogramChart } from '@/features/audiometry/audiogram-chart';
import { AudiometryForm } from '@/features/audiometry/audiometry-form';
import { initialValues, toInput } from '@/features/audiometry/audiometry-form-values';
import { formatDb, testPath } from '@/features/audiometry/audiometry-labels';
import {
  useAudiometryHistory,
  useAudiometryMutations,
  useAudiometryTest,
} from '@/features/audiometry/use-audiometry';
import {
  formatDate,
  formatDateTime,
  maskNationalId,
  patientPath,
} from '@/features/patients/patient-utils';
import { protocolPath } from '@/features/protocols/protocol-utils';
import { toApiError } from '@/services/api-client';
import { AUDIOMETRY_FREQUENCIES, type Thresholds, thresholdAt } from '@osgb/shared-types';

function ThresholdTable({ rows }: { rows: Array<{ label: string; t: Thresholds | null }> }) {
  return (
    <div className="scrollbar-subtle overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr>
            <th className="p-1.5 text-left text-xs font-semibold text-muted-foreground">dB HL</th>
            {AUDIOMETRY_FREQUENCIES.map((f) => (
              <th key={f} className="p-1.5 text-center text-xs font-semibold text-muted-foreground">
                {f >= 1000 ? `${f / 1000}k` : f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((r) => r.t)
            .map((r) => (
              <tr key={r.label} className="border-t border-border">
                <th scope="row" className="p-1.5 text-left font-medium whitespace-nowrap">
                  {r.label}
                </th>
                {AUDIOMETRY_FREQUENCIES.map((f) => {
                  const v = thresholdAt(r.t!, f);
                  return (
                    <td key={f} className="p-1.5 text-center tabular-nums">
                      {v === null ? <span className="text-muted-foreground">—</span> : v}
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function AudiometryTestPage() {
  const { testId } = useParams<'testId'>();
  const navigate = useNavigate();
  const test = useAudiometryTest(testId);
  const t = test.data;
  const history = useAudiometryHistory(t?.employeeId);
  const { update, remove } = useAudiometryMutations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (test.isPending) return <LoadingState title="Test yükleniyor…" />;
  if (test.error || !t) return <ErrorState onRetry={() => void test.refetch()} />;

  const title = `${t.employee.firstName} ${t.employee.lastName} · ${formatDate(t.performedAt)}`;

  if (editing) {
    return (
      <>
        <PageHeader
          title={`Testi düzenle · ${title}`}
          breadcrumbs={[
            { label: 'Doktor Modülü' },
            { label: 'Odyometri', to: PATHS.audiometry },
            { label: 'Düzenle' },
          ]}
        />
        <AudiometryForm
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
          { label: 'Odyometri', to: PATHS.audiometry },
          { label: formatDate(t.performedAt) },
        ]}
        actions={
          <Can permission={PERMISSIONS.AUDIOMETRY_MANAGE}>
            <div className="flex gap-2">
              <AppButton variant="secondary" onClick={() => setEditing(true)}>
                <Pencil />
                Düzenle
              </AppButton>
              <AppButton variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 />
                Sil
              </AppButton>
            </div>
          </Can>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <SectionCard
            title="Odyogram"
            actions={t.isBaseline ? <Badge variant="neutral">Başlangıç testi</Badge> : null}
          >
            <AudiogramChart
              airRight={t.airRight}
              airLeft={t.airLeft}
              boneRight={t.boneRight}
              boneLeft={t.boneLeft}
              className="w-full"
            />
            <div className="mt-3">
              <ThresholdTable
                rows={[
                  { label: 'Sağ hava', t: t.airRight },
                  { label: 'Sol hava', t: t.airLeft },
                  { label: 'Sağ kemik', t: t.boneRight },
                  { label: 'Sol kemik', t: t.boneLeft },
                ]}
              />
            </div>
          </SectionCard>
          <SectionCard title="Geçmiş testler" description="Dört frekans ortalaması, eski → yeni.">
            {history.data ? (
              history.data.length <= 1 ? (
                <p className="text-sm text-muted-foreground">
                  Bu hastanın başka odyometri testi yok.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {history.data.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                      {h.id === t.id ? (
                        <span className="font-medium">{formatDate(h.performedAt)} (bu test)</span>
                      ) : (
                        <Link
                          to={testPath(h.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatDate(h.performedAt)}
                        </Link>
                      )}
                      {h.isBaseline ? <Badge variant="neutral">Başlangıç</Badge> : null}
                      <span className="tabular-nums text-[#dc2626]">
                        Sağ {formatDb(h.ptaRight)}
                      </span>
                      <span className="tabular-nums text-[#2563eb]">Sol {formatDb(h.ptaLeft)}</span>
                      {h.protocol ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {h.protocol.protocolNumber}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title="Değerlendirme">
            <AnalysisPanel analysis={t.analysis} />
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
                <dt className="text-xs text-muted-foreground">Gürültüsüz süre</dt>
                <dd>{t.quietHours === null ? '—' : `${t.quietHours} saat`}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Cihaz</dt>
                <dd>{t.deviceName ?? '—'}</dd>
              </div>
            </dl>
            {t.notes ? <p className="mt-3 text-sm whitespace-pre-wrap">{t.notes}</p> : null}
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Test silinsin mi?"
        description="Test kaydı kaldırılır; eşik kayması hesapları bu testi artık dikkate almaz."
        confirmLabel="Sil"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(t.id, {
            onSuccess: () => {
              toast.success('Test silindi');
              void navigate(PATHS.audiometry, { replace: true });
            },
            onError: (e) => toast.error('Silinemedi', toApiError(e).message),
          })
        }
      />
    </>
  );
}
