import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { IdCardScanFields } from '@osgb/shared-types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AppButton } from '@/design-system/app-button';
import { Combobox } from '@/design-system/combobox';
import { DatePicker } from '@/design-system/date-picker';
import { FormField } from '@/design-system/form-field';
import { SectionCard } from '@/design-system/section-card';
import { toApiError } from '@/services/api-client';
import { AddressFields } from './address-fields';
import { GsmInput } from './gsm-input';
import { IdCardScanner } from './id-card-scanner';
import { EMPLOYEE_STATUS_LABELS } from './patient-badges';
import { PatientPhotoField, type PhotoChange } from './patient-photo';
import {
  emptyPatientForm,
  type PatientFormOutput,
  type PatientFormValues,
  patientSchema,
} from './patient-schema';
import { useCompanies } from './use-patients';
import { useOccupations } from '@/features/occupations/use-occupations';

interface PatientFormProps {
  defaultValues?: PatientFormValues;
  /** Edit mode: the stored record, so the current portrait can be shown and replaced. */
  patient?: { id: string; photoUpdatedAt: string | null };
  submitLabel: string;
  submitting: boolean;
  serverError?: unknown;
  onSubmit: (values: PatientFormOutput, photo: PhotoChange) => void;
  onCancel: () => void;
}

const GENDERS = [
  { value: 'MALE', label: 'Erkek' },
  { value: 'FEMALE', label: 'Kadın' },
] as const;

export function PatientForm({
  defaultValues,
  patient,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: PatientFormProps) {
  const form = useForm<PatientFormValues, unknown, PatientFormOutput>({
    resolver: zodResolver(patientSchema),
    defaultValues: defaultValues ?? emptyPatientForm,
    mode: 'onBlur',
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;
  const isEdit = patient !== undefined;
  const companies = useCompanies();
  const occupations = useOccupations({ pageSize: 100, isActive: true }, isEdit);
  const occupationOptions = useMemo(
    () =>
      (occupations.data?.items ?? []).map((o) => ({
        value: o.id,
        label: o.code ? `${o.name} (${o.code})` : o.name,
      })),
    [occupations.data],
  );
  const companyOptions = useMemo(
    () => (companies.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    [companies.data],
  );
  const [photo, setPhoto] = useState<PhotoChange>(null);
  const [firstName, lastName] = useWatch({
    control: form.control,
    name: ['firstName', 'lastName'],
  });
  const apiError = serverError ? toApiError(serverError) : null;

  const applyScan = (fields: IdCardScanFields) => {
    const set = (name: keyof PatientFormValues, value: string | undefined) => {
      if (value) setValue(name, value, { shouldDirty: true, shouldValidate: true });
    };
    set('nationalId', fields.nationalId);
    set('firstName', fields.firstName);
    set('lastName', fields.lastName);
    set('birthDate', fields.birthDate);
    set('gender', fields.gender);
    // Card document number (MRZ) is stored in the registration/document number field.
    set('registrationNumber', fields.documentNumber);
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit((values) => onSubmit(values, photo))(event)}
      noValidate
      className="flex flex-col gap-5"
    >
      {apiError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
        >
          {apiError.message}
          {Array.isArray(apiError.details) ? (
            <ul className="mt-1 list-disc pl-5 font-normal">
              {apiError.details.map((d) => (
                <li key={String(d)}>{String(d)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <SectionCard
        title="Kimlik bilgileri"
        description="Kimlik kartını tarayarak alanları otomatik doldurabilirsiniz."
      >
        <div className="mb-4 flex flex-col gap-4">
          <PatientPhotoField
            patientId={patient?.id}
            photoUpdatedAt={patient?.photoUpdatedAt}
            name={`${firstName} ${lastName}`.trim() || 'Hasta'}
            value={photo}
            onChange={setPhoto}
          />
          <IdCardScanner onApply={applyScan} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            id="patient-nationalId"
            label="T.C. Kimlik No"
            required
            error={errors.nationalId?.message}
            hint="11 hane; kontrol basamakları otomatik doğrulanır"
          >
            <Input
              id="patient-nationalId"
              inputMode="numeric"
              maxLength={11}
              placeholder="12345678901"
              aria-invalid={errors.nationalId ? true : undefined}
              {...register('nationalId')}
            />
          </FormField>
          <FormField
            id="patient-registrationNumber"
            label="Sicil No / Belge No"
            error={errors.registrationNumber?.message}
          >
            <Input id="patient-registrationNumber" {...register('registrationNumber')} />
          </FormField>
          <FormField
            id="patient-passportNumber"
            label="Pasaport No"
            error={errors.passportNumber?.message}
          >
            <Input
              id="patient-passportNumber"
              className="uppercase"
              {...register('passportNumber')}
            />
          </FormField>
          <FormField id="patient-firstName" label="Adı" required error={errors.firstName?.message}>
            <Input
              id="patient-firstName"
              autoComplete="given-name"
              aria-invalid={errors.firstName ? true : undefined}
              {...register('firstName')}
            />
          </FormField>
          <FormField id="patient-lastName" label="Soyadı" required error={errors.lastName?.message}>
            <Input
              id="patient-lastName"
              autoComplete="family-name"
              aria-invalid={errors.lastName ? true : undefined}
              {...register('lastName')}
            />
          </FormField>
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => (
              <FormField
                id="patient-birthDate"
                label="Doğum Tarihi"
                required
                error={errors.birthDate?.message}
                hint="gg.aa.yyyy yazın veya takvimden seçin"
              >
                <DatePicker
                  id="patient-birthDate"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  min={new Date(1900, 0, 1)}
                  max={new Date()}
                  invalid={Boolean(errors.birthDate)}
                />
              </FormField>
            )}
          />
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <FormField id="patient-gender" label="Cinsiyet" error={errors.gender?.message}>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="patient-gender">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />
          <FormField
            id="patient-motherName"
            label="Anne Adı"
            error={errors.motherName?.message}
            hint="Resmi kaynaktan doğrulanmaz; belgeden kontrol edin"
          >
            <Input id="patient-motherName" {...register('motherName')} />
          </FormField>
          <FormField
            id="patient-fatherName"
            label="Baba Adı"
            error={errors.fatherName?.message}
            hint="Resmi kaynaktan doğrulanmaz; belgeden kontrol edin"
          >
            <Input id="patient-fatherName" {...register('fatherName')} />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="İletişim">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <FormField
                id="patient-phone"
                label="GSM"
                required
                error={errors.phone?.message}
                hint="5XX XXX XX XX"
              >
                <GsmInput
                  id="patient-phone"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-invalid={errors.phone ? true : undefined}
                />
              </FormField>
            )}
          />
          <FormField id="patient-homePhone" label="Ev Tel" error={errors.homePhone?.message}>
            <Input
              id="patient-homePhone"
              inputMode="numeric"
              placeholder="2XX XXX XX XX"
              {...register('homePhone')}
            />
          </FormField>
          <FormField id="patient-email" label="e-Posta" error={errors.email?.message}>
            <Input
              id="patient-email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              {...register('email')}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Adres">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AddressFields control={control} />
          <FormField
            id="patient-addressLine"
            label="Adres (cadde, sokak, no)"
            error={errors.addressLine?.message}
            className="sm:col-span-2 lg:col-span-3"
          >
            <Input
              id="patient-addressLine"
              autoComplete="street-address"
              {...register('addressLine')}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        title={isEdit ? 'Çalışma bilgileri' : 'Uyarı / Açıklama'}
        description={
          isEdit
            ? undefined
            : 'Firma ve durum bilgileri kayıt sonrasında düzenleme ekranından atanır.'
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isEdit ? (
            <>
              <Controller
                control={control}
                name="companyId"
                render={({ field }) => (
                  <FormField id="patient-company" label="Firma" error={errors.companyId?.message}>
                    <Combobox
                      id="patient-company"
                      value={field.value || null}
                      onChange={(next) => field.onChange(next ?? '')}
                      options={companyOptions}
                      loading={companies.isPending}
                      placeholder="Firma seçin"
                      searchPlaceholder="Firma ara…"
                      invalid={Boolean(errors.companyId)}
                    />
                  </FormField>
                )}
              />
              <Controller
                control={control}
                name="occupationId"
                render={({ field }) => (
                  <FormField
                    id="patient-occupation"
                    label="Meslek"
                    error={errors.occupationId?.message}
                  >
                    <Combobox
                      id="patient-occupation"
                      value={field.value || null}
                      onChange={(next) => field.onChange(next ?? '')}
                      options={occupationOptions}
                      loading={occupations.isPending}
                      placeholder="Meslek seçin"
                      searchPlaceholder="Meslek ara…"
                    />
                  </FormField>
                )}
              />
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <FormField id="patient-status" label="Durum" error={errors.status?.message}>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="patient-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, { label }]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              />
            </>
          ) : null}
          <FormField
            id="patient-notes"
            label="Uyarı / Açıklama"
            error={errors.notes?.message}
            className="sm:col-span-2 lg:col-span-3"
          >
            <Textarea
              id="patient-notes"
              placeholder="Alerji, engel durumu, özel not…"
              {...register('notes')}
            />
          </FormField>
        </div>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Vazgeç
        </AppButton>
        <AppButton type="submit" loading={submitting}>
          {submitLabel}
        </AppButton>
      </div>
    </form>
  );
}
