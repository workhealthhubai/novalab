import { ClipboardPlus, Pencil, PenLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { formatGsm, PERMISSIONS } from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import { Can } from '@/components/can';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { SectionCard } from '@/design-system/section-card';
import { toast } from '@/design-system/toast';
import { EmployeeStatusBadge } from '@/features/patients/patient-badges';
import { PatientMedicalSummary } from '@/features/patients/patient-medical-summary';
import { PatientAvatar } from '@/features/patients/patient-photo';
import { formatDate, formatDateTime, patientEditPath } from '@/features/patients/patient-utils';
import { useDeletePatient, usePatient } from '@/features/patients/use-patients';
import { NewProtocolDialog } from '@/features/protocols/new-protocol-dialog';
import { ProtocolStatusBadge } from '@/features/protocols/protocol-badges';
import { PROTOCOL_TYPE_LABELS } from '@/features/protocols/protocol-labels';
import { itemProgress, protocolPath } from '@/features/protocols/protocol-utils';
import { useProtocols } from '@/features/protocols/use-protocols';
import { GiveConsentDialog } from '@/features/consents/consent-dialogs';
import { CONSENT_TYPE_LABELS, SUMMARY_STATE } from '@/features/consents/consent-labels';
import { useConsentSummary, useConsentTemplates } from '@/features/consents/use-consents';
import { usePermissions } from '@/hooks/use-permissions';
import { StatusBadge } from '@/design-system/status-badge';
import { FITNESS_DECISION } from '@/features/examinations/examination-labels';
import type { ConsentType } from '@osgb/shared-types';
import { toApiError } from '@/services/api-client';
import type { Patient } from '@/types/patient';

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-base text-foreground' : 'text-base text-foreground'}>
        {value || '—'}
      </dd>
    </div>
  );
}

function address(patient: Patient): string {
  return [
    patient.addressNeighborhood?.name,
    patient.addressDistrict?.name,
    patient.addressProvince?.name,
    patient.addressLine,
  ]
    .filter(Boolean)
    .join(', ');
}

export function PatientDetailPage() {
  const { patientId = '' } = useParams<'patientId'>();
  const navigate = useNavigate();
  const patient = usePatient(patientId);
  const remove = useDeletePatient();
  const [confirm, setConfirm] = useState<'delete' | null>(null);
  const [protocolDialog, setProtocolDialog] = useState(false);
  const { can } = usePermissions();
  const [consentDialog, setConsentDialog] = useState<ConsentType | null>(null);
  const consentSummary = useConsentSummary(patientId, can(PERMISSIONS.CONSENTS_READ));
  const consentTemplates = useConsentTemplates(
    { activeOnly: true },
    can(PERMISSIONS.CONSENTS_READ),
  );
  const protocols = useProtocols({ employeeId: patientId, pageSize: 10 }, Boolean(patientId));

  const breadcrumbs = [
    { label: 'Hasta Kayıt Kabul' },
    { label: 'Hasta Kayıt', to: PATHS.patients },
    { label: patient.data ? `${patient.data.firstName} ${patient.data.lastName}` : 'Hasta' },
  ];

  if (patient.isPending) {
    return (
      <>
        <PageHeader title="Hasta" breadcrumbs={breadcrumbs} />
        <LoadingState />
      </>
    );
  }
  if (patient.error || !patient.data) {
    return (
      <>
        <PageHeader title="Hasta" breadcrumbs={breadcrumbs} />
        <ErrorState
          title="Hasta bulunamadı"
          description={patient.error ? toApiError(patient.error).message : undefined}
          onRetry={() => void patient.refetch()}
        />
      </>
    );
  }
  const p = patient.data;

  return (
    <>
      <PageHeader
        title={`${p.firstName} ${p.lastName}`}
        description={p.notes ? `⚠ ${p.notes}` : undefined}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Can permission={PERMISSIONS.PROTOCOLS_CREATE}>
              <AppButton onClick={() => setProtocolDialog(true)}>
                <ClipboardPlus />
                Yeni Protokol
              </AppButton>
            </Can>
            <Can permission={PERMISSIONS.EMPLOYEES_UPDATE}>
              <AppButton variant="secondary" asChild>
                <Link to={patientEditPath(p.id)}>
                  <Pencil />
                  Düzenle
                </Link>
              </AppButton>
            </Can>
            <Can permission={PERMISSIONS.EMPLOYEES_DELETE}>
              <AppButton variant="danger" onClick={() => setConfirm('delete')}>
                <Trash2 />
                Sil
              </AppButton>
            </Can>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <PatientAvatar
          patientId={p.id}
          photoUpdatedAt={p.photoUpdatedAt}
          name={`${p.firstName} ${p.lastName}`}
          className="h-32 w-24"
        />
        <EmployeeStatusBadge value={p.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Kimlik bilgileri">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="T.C. Kimlik No" value={p.nationalId} mono />
            <Field label="Sicil No / Belge No" value={p.registrationNumber} />
            <Field label="Pasaport No" value={p.passportNumber} mono />
            <Field label="Doğum Tarihi" value={formatDate(p.birthDate)} />
            <Field
              label="Cinsiyet"
              value={p.gender === 'MALE' ? 'Erkek' : p.gender === 'FEMALE' ? 'Kadın' : null}
            />
            <Field label="Anne Adı" value={p.motherName} />
            <Field label="Baba Adı" value={p.fatherName} />
          </dl>
        </SectionCard>

        <SectionCard title="İletişim ve adres">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="GSM" value={p.phone ? formatGsm(p.phone) : null} mono />
            <Field label="Ev Tel" value={p.homePhone ? formatGsm(p.homePhone) : null} mono />
            <Field label="e-Posta" value={p.email} />
            <div className="col-span-2">
              <Field label="Adres" value={address(p)} />
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Çalışma bilgileri">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Firma" value={p.company?.name} />
            <Field label="Şube" value={p.branch?.name} />
            <Field label="İşyeri" value={p.workplace?.name} />
            <Field
              label="Meslek"
              value={
                p.occupation
                  ? p.occupation.code
                    ? `${p.occupation.name} (${p.occupation.code})`
                    : p.occupation.name
                  : p.jobTitle
              }
            />
            <Field label="Bölüm" value={p.department} />
            <Field label="İşe giriş" value={formatDate(p.hireDate)} />
          </dl>
        </SectionCard>

        <SectionCard title="Kayıt">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Oluşturulma" value={formatDateTime(p.createdAt)} />
            <Field label="Son güncelleme" value={formatDateTime(p.updatedAt)} />
            <div className="col-span-2">
              <Field label="Uyarı / Açıklama" value={p.notes} />
            </div>
          </dl>
        </SectionCard>
      </div>

      {can(PERMISSIONS.CONSENTS_READ) ? (
        <SectionCard
          title="KVKK rızaları"
          description="Yürürlükteki metinlere göre durum; eksik olanlar hasta kartından alınabilir."
          actions={
            <Can permission={PERMISSIONS.DOCUMENTS_SIGN}>
              <AppButton size="sm" variant="secondary" asChild>
                <Link to={`${PATHS.documentSigning}?patientId=${p.id}`}>
                  <PenLine />
                  Belge İmza
                </Link>
              </AppButton>
            </Can>
          }
        >
          {consentSummary.data ? (
            consentSummary.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Henüz rıza metni yayınlanmamış (Genel Ayarlar → KVKK İzinleri).
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {consentSummary.data.map((item) => (
                  <li
                    key={item.type}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="flex-1">
                      {CONSENT_TYPE_LABELS[item.type]}
                      <span className="block text-xs text-muted-foreground">
                        {item.latest
                          ? `v${item.latest.template.version} · ${formatDateTime(item.latest.givenAt)}`
                          : `yürürlükte v${item.activeTemplate.version}`}
                      </span>
                    </span>
                    <StatusBadge
                      status={SUMMARY_STATE[item.state].status}
                      label={SUMMARY_STATE[item.state].label}
                    />
                    {item.state !== 'CURRENT' ? (
                      <Can permission={PERMISSIONS.CONSENTS_MANAGE}>
                        <AppButton
                          size="sm"
                          variant="ghost"
                          onClick={() => setConsentDialog(item.type)}
                        >
                          Rıza al
                        </AppButton>
                      </Can>
                    ) : null}
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              {consentSummary.isPending ? 'Yükleniyor…' : 'Rıza bilgisi alınamadı.'}
            </p>
          )}
        </SectionCard>
      ) : null}

      <PatientMedicalSummary patientId={p.id} />

      <SectionCard title="Protokoller">
        {protocols.data && protocols.data.items.length > 0 ? (
          <ul className="divide-y divide-border">
            {protocols.data.items.map((protocol) => {
              const progress = itemProgress(protocol.items);
              return (
                <li key={protocol.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <Link
                    to={protocolPath(protocol.id)}
                    className="font-mono font-medium text-foreground hover:text-primary-dark"
                  >
                    {protocol.protocolNumber}
                  </Link>
                  <span>{PROTOCOL_TYPE_LABELS[protocol.type]}</span>
                  <span className="text-muted-foreground">{formatDateTime(protocol.openedAt)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {progress.done} / {progress.total} tetkik
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {protocol.examinations[0] ? (
                      <StatusBadge
                        status={FITNESS_DECISION[protocol.examinations[0].fitnessDecision].status}
                        label={FITNESS_DECISION[protocol.examinations[0].fitnessDecision].label}
                      />
                    ) : null}
                    <ProtocolStatusBadge value={protocol.status} />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {protocols.isPending ? 'Yükleniyor…' : 'Bu hasta için henüz protokol açılmadı.'}
          </p>
        )}
      </SectionCard>

      <GiveConsentDialog
        open={consentDialog !== null}
        onOpenChange={(open) => !open && setConsentDialog(null)}
        type={consentDialog ?? undefined}
        templates={consentTemplates.data ?? []}
        patient={{
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
        }}
        onGiven={() => toast.success('Rıza kaydedildi')}
      />
      <NewProtocolDialog
        open={protocolDialog}
        onOpenChange={setProtocolDialog}
        patient={{
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
        }}
        onCreated={(protocol) => {
          toast.success('Protokol açıldı', protocol.protocolNumber);
          void navigate(protocolPath(protocol.id));
        }}
      />

      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Hasta kaydını silmek istediğinize emin misiniz?"
        description="Kayıt pasife alınır; denetim izinde saklanmaya devam eder."
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(p.id, {
            onSuccess: () => {
              toast.success('Hasta kaydı silindi');
              void navigate(PATHS.patients, { replace: true });
            },
            onError: (error) => toast.error('Silinemedi', toApiError(error).message),
          })
        }
      />
    </>
  );
}
