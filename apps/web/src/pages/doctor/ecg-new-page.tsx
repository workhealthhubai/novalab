import { useNavigate, useSearchParams } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { toast } from '@/design-system/toast';
import { EcgForm } from '@/features/ecg/ecg-form';
import { initialValues, toInput } from '@/features/ecg/ecg-form-values';
import { ecgPath } from '@/features/ecg/ecg-labels';
import { useEcgMutations } from '@/features/ecg/use-ecg';
import { usePatient } from '@/features/patients/use-patients';
import type { PatientListItem } from '@/types/patient';

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

export function EcgNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const protocolId = searchParams.get('protocolId');
  const patient = usePatient(patientId ?? undefined);
  const { create } = useEcgMutations();

  if (patientId && patient.isPending) return <LoadingState title="Hasta yükleniyor…" />;

  return (
    <>
      <PageHeader
        title="Yeni EKG kaydı"
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'EKG', to: PATHS.ecg },
          { label: 'Yeni kayıt' },
        ]}
      />
      <EcgForm
        initial={initialValues({
          patient: patient.data ? toListItem(patient.data) : null,
          protocolId,
        })}
        submitLabel="Kaydı Oluştur"
        pending={create.isPending}
        error={create.error}
        onCancel={() => void navigate(PATHS.ecg)}
        onSubmit={(values) =>
          create.mutate(toInput(values), {
            onSuccess: (r) => {
              toast.success('EKG kaydedildi');
              void navigate(ecgPath(r.id), { replace: true });
            },
          })
        }
      />
    </>
  );
}
