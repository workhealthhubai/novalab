import { useNavigate, useSearchParams } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { toast } from '@/design-system/toast';
import { AudiometryForm } from '@/features/audiometry/audiometry-form';
import { initialValues, toInput } from '@/features/audiometry/audiometry-form-values';
import { testPath } from '@/features/audiometry/audiometry-labels';
import { useAudiometryMutations } from '@/features/audiometry/use-audiometry';
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
  };
}

export function AudiometryNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const protocolId = searchParams.get('protocolId');
  const patient = usePatient(patientId ?? undefined);
  const { create } = useAudiometryMutations();

  if (patientId && patient.isPending) return <LoadingState title="Hasta yükleniyor…" />;

  return (
    <>
      <PageHeader
        title="Yeni odyometri testi"
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'Odyometri', to: PATHS.audiometry },
          { label: 'Yeni test' },
        ]}
      />
      <AudiometryForm
        initial={initialValues({
          patient: patient.data ? toListItem(patient.data) : null,
          protocolId,
        })}
        submitLabel="Testi Kaydet"
        pending={create.isPending}
        error={create.error}
        onCancel={() => void navigate(PATHS.audiometry)}
        onSubmit={(values) =>
          create.mutate(toInput(values), {
            onSuccess: (t) => {
              toast.success('Test kaydedildi');
              void navigate(testPath(t.id), { replace: true });
            },
          })
        }
      />
    </>
  );
}
