import { Pencil, Trash2 } from 'lucide-react';
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
import { PatientAvatar } from '@/features/patients/patient-photo';
import { formatDate, formatDateTime, patientEditPath } from '@/features/patients/patient-utils';
import { useDeletePatient, usePatient } from '@/features/patients/use-patients';
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
            <Field label="Görev" value={p.jobTitle} />
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
