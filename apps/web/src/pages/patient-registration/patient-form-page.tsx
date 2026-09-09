import { useNavigate, useParams } from 'react-router';
import { PERMISSIONS } from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { toast } from '@/design-system/toast';
import { PatientForm } from '@/features/patients/patient-form';
import type { PhotoChange } from '@/features/patients/patient-photo';
import { type PatientFormOutput, toPatientInput } from '@/features/patients/patient-schema';
import { patientPath, toFormValues } from '@/features/patients/patient-utils';
import {
  useCreatePatient,
  usePatient,
  useRemovePatientPhoto,
  useSetPatientPhoto,
  useUpdatePatient,
} from '@/features/patients/use-patients';
import { toApiError } from '@/services/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { ForbiddenPage } from '@/pages/forbidden-page';

/** Create (`/patients/new`) and edit (`/patients/:patientId/edit`) share this page. */
export function PatientFormPage() {
  const { patientId } = useParams<'patientId'>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const isEdit = Boolean(patientId);
  const patient = usePatient(patientId);
  const create = useCreatePatient();
  const update = useUpdatePatient(patientId ?? '');
  const setPhoto = useSetPatientPhoto();
  const removePhoto = useRemovePatientPhoto();

  if (isEdit ? !can(PERMISSIONS.EMPLOYEES_UPDATE) : !can(PERMISSIONS.EMPLOYEES_CREATE))
    return <ForbiddenPage />;

  /** The portrait is stored after the record exists; a photo failure never loses the saved record. */
  const applyPhoto = async (id: string, photo: PhotoChange) => {
    if (!photo) return;
    try {
      if (photo === 'remove') await removePhoto.mutateAsync(id);
      else await setPhoto.mutateAsync({ id, file: photo.file });
    } catch (error) {
      toast.error('Fotoğraf kaydedilemedi', toApiError(error).message);
    }
  };

  const submit = (values: PatientFormOutput, photo: PhotoChange) => {
    const input = toPatientInput(values);
    const mutation = isEdit ? update.mutateAsync(input) : create.mutateAsync(input);
    mutation
      .then(async (saved) => {
        await applyPhoto(saved.id, photo);
        toast.success(
          isEdit ? 'Hasta bilgileri güncellendi' : 'Hasta kaydı oluşturuldu',
          `${saved.firstName} ${saved.lastName}`,
        );
        void navigate(patientPath(saved.id), { replace: true });
      })
      .catch(() => undefined); // error is rendered inside the form
  };

  const title = isEdit ? 'Hasta Düzenle' : 'Yeni Hasta';
  const breadcrumbs = [
    { label: 'Hasta Kayıt Kabul' },
    { label: 'Hasta Kayıt', to: PATHS.patients },
    { label: title },
  ];

  if (isEdit && patient.isPending) {
    return (
      <>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <LoadingState />
      </>
    );
  }
  if (isEdit && patient.error) {
    return (
      <>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <ErrorState onRetry={() => void patient.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        description="Zorunlu alanlar * ile işaretlidir."
        breadcrumbs={breadcrumbs}
      />
      <PatientForm
        key={patient.data?.id ?? 'new'}
        defaultValues={patient.data ? toFormValues(patient.data) : undefined}
        patient={
          patient.data
            ? { id: patient.data.id, photoUpdatedAt: patient.data.photoUpdatedAt }
            : undefined
        }
        submitLabel={isEdit ? 'Kaydet' : 'Hastayı Kaydet'}
        submitting={
          create.isPending || update.isPending || setPhoto.isPending || removePhoto.isPending
        }
        serverError={create.error ?? update.error}
        onSubmit={submit}
        onCancel={() => void navigate(patientId ? patientPath(patientId) : PATHS.patients)}
      />
    </>
  );
}
