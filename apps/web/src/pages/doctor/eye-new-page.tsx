import { useNavigate, useSearchParams } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { toast } from '@/design-system/toast';
import { EyeForm } from '@/features/eye/eye-form';
import { initialValues, toInput } from '@/features/eye/eye-form-values';
import { eyePath } from '@/features/eye/eye-labels';
import { useEyeMutations } from '@/features/eye/use-eye';
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

export function EyeNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const protocolId = searchParams.get('protocolId');
  const patient = usePatient(patientId ?? undefined);
  const { create } = useEyeMutations();

  if (patientId && patient.isPending) return <LoadingState title="Hasta yükleniyor…" />;

  return (
    <>
      <PageHeader
        title="Yeni göz muayenesi"
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'Göz', to: PATHS.eye },
          { label: 'Yeni muayene' },
        ]}
      />
      <EyeForm
        initial={initialValues({
          patient: patient.data ? toListItem(patient.data) : null,
          protocolId,
        })}
        submitLabel="Muayeneyi Kaydet"
        pending={create.isPending}
        error={create.error}
        onCancel={() => void navigate(PATHS.eye)}
        onSubmit={(values) =>
          create.mutate(toInput(values), {
            onSuccess: (e) => {
              toast.success('Muayene kaydedildi');
              void navigate(eyePath(e.id), { replace: true });
            },
          })
        }
      />
    </>
  );
}
