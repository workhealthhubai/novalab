import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { PERMISSIONS } from '@osgb/shared-types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AppButton } from '@/design-system/app-button';
import { Combobox } from '@/design-system/combobox';
import { DatePicker } from '@/design-system/date-picker';
import { ErrorState } from '@/design-system/error-state';
import { FormField } from '@/design-system/form-field';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { SectionCard } from '@/design-system/section-card';
import { toast } from '@/design-system/toast';
import { OrganizationLogo } from '@/features/organization/organization-logo';
import {
  type OrganizationFormValues,
  organizationSchema,
  toFormValues,
  toOrganizationInput,
} from '@/features/organization/organization-schema';
import {
  useOrganization,
  useOrganizationMutations,
} from '@/features/organization/use-organization';
import { useDistricts, useProvinces } from '@/features/patients/use-patients';
import { usePermissions } from '@/hooks/use-permissions';
import { toApiError } from '@/services/api-client';
import type { Organization } from '@/types/organization';

const breadcrumbs = [{ label: 'Genel Ayarlar' }, { label: 'Kurum Bilgileri' }];

export function OrganizationPage() {
  const organization = useOrganization();
  if (organization.isPending) {
    return (
      <>
        <PageHeader title="Kurum Bilgileri" breadcrumbs={breadcrumbs} />
        <LoadingState />
      </>
    );
  }
  if (organization.error || !organization.data) {
    return (
      <>
        <PageHeader title="Kurum Bilgileri" breadcrumbs={breadcrumbs} />
        <ErrorState
          description={organization.error ? toApiError(organization.error).message : undefined}
          onRetry={() => void organization.refetch()}
        />
      </>
    );
  }
  return (
    <OrganizationForm
      key={organization.data.profile.id + organization.data.profile.logoUpdatedAt}
      organization={organization.data}
    />
  );
}

function OrganizationForm({ organization }: { organization: Organization }) {
  const { can } = usePermissions();
  const canEdit = can(PERMISSIONS.SYSTEM_MANAGE);
  const { update } = useOrganizationMutations();
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: toFormValues(organization),
    mode: 'onBlur',
    disabled: !canEdit,
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = form;
  const provinceId = useWatch({ control, name: 'addressProvinceId' });
  const provinces = useProvinces();
  const districts = useDistricts(provinceId);
  const provinceOptions = useMemo(
    () => (provinces.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    [provinces.data],
  );
  const districtOptions = useMemo(
    () => (districts.data ?? []).map((d) => ({ value: String(d.id), label: d.name })),
    [districts.data],
  );
  const apiError = update.error ? toApiError(update.error) : null;

  const submit = (values: OrganizationFormValues) =>
    update.mutate(toOrganizationInput(values), {
      onSuccess: () => toast.success('Kurum bilgileri kaydedildi'),
    });

  return (
    <>
      <PageHeader
        title="Kurum Bilgileri"
        description="OSGB'nin resmi kimliği; rapor başlık ve altbilgilerinde kullanılır."
        breadcrumbs={breadcrumbs}
      />
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(submit)(event)}
        className="flex flex-col gap-5"
      >
        {apiError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {apiError.message}
          </div>
        ) : null}

        <SectionCard title="Kurum kimliği">
          <div className="mb-4">
            <OrganizationLogo
              logoUpdatedAt={organization.profile.logoUpdatedAt}
              canEdit={canEdit}
              name={organization.name}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              id="org-name"
              label="Kurum Adı"
              required
              error={errors.name?.message}
              hint="Uygulamada görünen kısa ad"
            >
              <Input
                id="org-name"
                aria-invalid={errors.name ? true : undefined}
                {...register('name')}
              />
            </FormField>
            <FormField
              id="org-legalName"
              label="Ticari Ünvan"
              error={errors.legalName?.message}
              className="lg:col-span-2"
            >
              <Input
                id="org-legalName"
                placeholder="… Ortak Sağlık Güvenlik Birimi Ltd. Şti."
                {...register('legalName')}
              />
            </FormField>
            <FormField
              id="org-manager"
              label="Sorumlu Müdür"
              error={errors.responsibleManager?.message}
            >
              <Input id="org-manager" {...register('responsibleManager')} />
            </FormField>
            <FormField
              id="org-authNo"
              label="OSGB Yetki Belgesi No"
              error={errors.authorizationNumber?.message}
            >
              <Input id="org-authNo" {...register('authorizationNumber')} />
            </FormField>
            <Controller
              control={control}
              name="authorizationDate"
              render={({ field }) => (
                <FormField
                  id="org-authDate"
                  label="Yetki Belgesi Tarihi"
                  error={errors.authorizationDate?.message}
                >
                  <DatePicker
                    id="org-authDate"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    max={new Date()}
                    disabled={!canEdit}
                    invalid={Boolean(errors.authorizationDate)}
                  />
                </FormField>
              )}
            />
          </div>
        </SectionCard>

        <SectionCard title="Vergi ve SGK">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField id="org-taxOffice" label="Vergi Dairesi" error={errors.taxOffice?.message}>
              <Input id="org-taxOffice" {...register('taxOffice')} />
            </FormField>
            <FormField
              id="org-taxNumber"
              label="Vergi No"
              error={errors.taxNumber?.message}
              hint="10 hane (şahıs firması için TC)"
            >
              <Input
                id="org-taxNumber"
                inputMode="numeric"
                maxLength={11}
                aria-invalid={errors.taxNumber ? true : undefined}
                {...register('taxNumber')}
              />
            </FormField>
            <FormField
              id="org-sgk"
              label="SGK Sicil No"
              error={errors.sgkRegistrationNumber?.message}
            >
              <Input id="org-sgk" {...register('sgkRegistrationNumber')} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="İletişim ve adres">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField id="org-phone" label="Telefon" error={errors.phone?.message}>
              <Input id="org-phone" inputMode="tel" {...register('phone')} />
            </FormField>
            <FormField id="org-fax" label="Faks" error={errors.fax?.message}>
              <Input id="org-fax" inputMode="tel" {...register('fax')} />
            </FormField>
            <FormField id="org-email" label="e-Posta" error={errors.email?.message}>
              <Input
                id="org-email"
                type="email"
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
            </FormField>
            <FormField id="org-website" label="Web Sitesi" error={errors.website?.message}>
              <Input
                id="org-website"
                placeholder="www.osgb.com.tr"
                aria-invalid={errors.website ? true : undefined}
                {...register('website')}
              />
            </FormField>
            <Controller
              control={control}
              name="addressProvinceId"
              render={({ field }) => (
                <FormField id="org-province" label="İl">
                  <Combobox
                    id="org-province"
                    value={field.value === null ? null : String(field.value)}
                    onChange={(next) => {
                      field.onChange(next === null ? null : Number(next));
                      setValue('addressDistrictId', null, { shouldDirty: true });
                    }}
                    options={provinceOptions}
                    loading={provinces.isPending}
                    disabled={!canEdit}
                    placeholder="İl seçin"
                    searchPlaceholder="Yazarak arayın…"
                  />
                </FormField>
              )}
            />
            <Controller
              control={control}
              name="addressDistrictId"
              render={({ field }) => (
                <FormField id="org-district" label="İlçe">
                  <Combobox
                    id="org-district"
                    value={field.value === null ? null : String(field.value)}
                    onChange={(next) => field.onChange(next === null ? null : Number(next))}
                    options={districtOptions}
                    loading={Boolean(provinceId) && districts.isPending}
                    disabled={!canEdit || !provinceId}
                    placeholder={provinceId ? 'İlçe seçin' : 'Önce il seçin'}
                    searchPlaceholder="Yazarak arayın…"
                  />
                </FormField>
              )}
            />
            <FormField
              id="org-address"
              label="Adres"
              error={errors.addressLine?.message}
              className="sm:col-span-2 lg:col-span-3"
            >
              <Textarea id="org-address" rows={2} {...register('addressLine')} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title="Rapor altbilgisi"
          description="Raporların en altına yazılır (ör. banka bilgileri, yasal uyarı)."
        >
          <FormField id="org-footer" label="Altbilgi metni" error={errors.reportFooter?.message}>
            <Textarea id="org-footer" rows={3} {...register('reportFooter')} />
          </FormField>
        </SectionCard>

        {canEdit ? (
          <div className="flex justify-end">
            <AppButton type="submit" loading={update.isPending} disabled={!isDirty}>
              Kaydet
            </AppButton>
          </div>
        ) : null}
      </form>
    </>
  );
}
