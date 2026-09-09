import { Controller, type Control, useWatch } from 'react-hook-form';
import { useMemo } from 'react';
import { Combobox } from '@/design-system/combobox';
import { FormField } from '@/design-system/form-field';
import type { LocationRef } from '@/types/patient';
import type { PatientFormValues } from './patient-schema';
import { useDistricts, useNeighborhoods, useProvinces } from './use-patients';

interface LocationSelectProps {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  options: LocationRef[] | undefined;
  loading?: boolean;
  disabled?: boolean;
  placeholder: string;
}

/** Searchable select over location refs (numeric ids). */
function LocationSelect({
  id,
  value,
  onChange,
  options,
  loading,
  disabled,
  placeholder,
}: LocationSelectProps) {
  const items = useMemo(
    () => (options ?? []).map((option) => ({ value: String(option.id), label: option.name })),
    [options],
  );
  return (
    <Combobox
      id={id}
      value={value === null ? null : String(value)}
      onChange={(next) => onChange(next === null ? null : Number(next))}
      options={items}
      loading={loading}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder="Yazarak arayın…"
    />
  );
}

/** İl → İlçe → Mahalle cascading selects; changing a parent clears its children. */
export function AddressFields({ control }: { control: Control<PatientFormValues> }) {
  const provinceId = useWatch({ control, name: 'addressProvinceId' });
  const districtId = useWatch({ control, name: 'addressDistrictId' });
  const provinces = useProvinces();
  const districts = useDistricts(provinceId);
  const neighborhoods = useNeighborhoods(districtId);

  return (
    <>
      <Controller
        control={control}
        name="addressProvinceId"
        render={({ field, fieldState }) => (
          <FormField id="patient-province" label="İl" error={fieldState.error?.message}>
            <LocationSelect
              id="patient-province"
              value={field.value}
              onChange={field.onChange}
              options={provinces.data}
              loading={provinces.isPending}
              placeholder="İl seçin"
            />
          </FormField>
        )}
      />
      <Controller
        control={control}
        name="addressDistrictId"
        render={({ field, fieldState }) => (
          <FormField id="patient-district" label="İlçe" error={fieldState.error?.message}>
            <LocationSelect
              id="patient-district"
              value={field.value}
              onChange={field.onChange}
              options={districts.data}
              loading={Boolean(provinceId) && districts.isPending}
              disabled={!provinceId}
              placeholder={provinceId ? 'İlçe seçin' : 'Önce il seçin'}
            />
          </FormField>
        )}
      />
      <Controller
        control={control}
        name="addressNeighborhoodId"
        render={({ field, fieldState }) => (
          <FormField
            id="patient-neighborhood"
            label="Mahalle / Köy"
            error={fieldState.error?.message}
          >
            <LocationSelect
              id="patient-neighborhood"
              value={field.value}
              onChange={field.onChange}
              options={neighborhoods.data}
              loading={Boolean(districtId) && neighborhoods.isPending}
              disabled={!districtId}
              placeholder={
                districtId
                  ? neighborhoods.data?.length === 0
                    ? 'Mahalle verisi yüklenmemiş'
                    : 'Mahalle seçin'
                  : 'Önce ilçe seçin'
              }
            />
          </FormField>
        )}
      />
    </>
  );
}
