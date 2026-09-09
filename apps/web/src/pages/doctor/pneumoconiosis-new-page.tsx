import { useNavigate, useSearchParams } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { toast } from '@/design-system/toast';
import { usePatient } from '@/features/patients/use-patients';
import { PneumoconiosisForm } from '@/features/pneumoconiosis/pneumoconiosis-form';
import { initialValues, toInput } from '@/features/pneumoconiosis/pneumoconiosis-form-values';
import { readingPath } from '@/features/pneumoconiosis/pneumoconiosis-labels';
import { usePneumoMutations } from '@/features/pneumoconiosis/use-pneumoconiosis';
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

export function PneumoconiosisNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const protocolId = searchParams.get('protocolId');
  const patient = usePatient(patientId ?? undefined);
  const { create } = usePneumoMutations();

  if (patientId && patient.isPending) return <LoadingState title="Hasta yükleniyor…" />;

  return (
    <>
      <PageHeader
        title="Yeni ILO okuması"
        breadcrumbs={[
          { label: 'Doktor Modülü' },
          { label: 'Pnömokonyoz', to: PATHS.pneumoconiosis },
          { label: 'Yeni okuma' },
        ]}
      />
      <PneumoconiosisForm
        initial={initialValues({
          patient: patient.data ? toListItem(patient.data) : null,
          protocolId,
        })}
        submitLabel="Okumayı Kaydet"
        pending={create.isPending}
        error={create.error}
        onCancel={() => void navigate(PATHS.pneumoconiosis)}
        onSubmit={(values) =>
          create.mutate(toInput(values), {
            onSuccess: (r) => {
              toast.success('Okuma kaydedildi');
              void navigate(readingPath(r.id), { replace: true });
            },
          })
        }
      />
    </>
  );
}
