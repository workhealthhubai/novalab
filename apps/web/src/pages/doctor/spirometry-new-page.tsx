import { useNavigate, useSearchParams } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { toast } from '@/design-system/toast';
import { usePatient } from '@/features/patients/use-patients';
import { SpirometryForm } from '@/features/spirometry/spirometry-form';
import { initialValues, toInput } from '@/features/spirometry/spirometry-form-values';
import { spirometryPath } from '@/features/spirometry/spirometry-labels';
import { useSpirometryMutations } from '@/features/spirometry/use-spirometry';
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

export function SpirometryNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const protocolId = searchParams.get('protocolId');
  const patient = usePatient(patientId ?? undefined);
  const { create } = useSpirometryMutations();

  if (patientId && patient.isPending) return <LoadingState title="Hasta yükleniyor…" />;

  return (
    <>
      <PageHeader
        title="Yeni spirometri testi"
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'Spirometri', to: PATHS.spirometry },
          { label: 'Yeni test' },
        ]}
      />
      <SpirometryForm
        initial={initialValues({
          patient: patient.data ? toListItem(patient.data) : null,
          protocolId,
        })}
        submitLabel="Testi Kaydet"
        pending={create.isPending}
        error={create.error}
        onCancel={() => void navigate(PATHS.spirometry)}
        onSubmit={(values) =>
          create.mutate(toInput(values), {
            onSuccess: (t) => {
              toast.success('Test kaydedildi');
              void navigate(spirometryPath(t.id), { replace: true });
            },
          })
        }
      />
    </>
  );
}
