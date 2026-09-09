import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { companiesService } from '@/services/companies.service';
import { env } from '@/lib/env';
import { identityService } from '@/services/identity.service';
import { isClientScanSupported, scanIdCardOnClient } from './ocr/client-scanner';
import { scanIdCardHybrid } from './ocr/hybrid-scanner';
import { locationsService } from '@/services/locations.service';
import { patientsService } from '@/services/patients.service';
import type { PatientInput, PatientListQuery } from '@/types/patient';

export const patientKeys = {
  all: ['patients'] as const,
  list: (query: PatientListQuery) => ['patients', 'list', query] as const,
  detail: (id: string) => ['patients', 'detail', id] as const,
};

export function usePatients(query: PatientListQuery, enabled = true) {
  return useQuery({
    queryKey: patientKeys.list(query),
    queryFn: () => patientsService.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id ?? ''),
    queryFn: () => patientsService.get(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientInput) => patientsService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.all }),
  });
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PatientInput>) => patientsService.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.all }),
  });
}

export const patientPhotoKey = (id: string, version: string | null) =>
  ['patients', 'photo', id, version] as const;

/** The stored portrait as a Blob (null when none); `version` is `photoUpdatedAt` so replacements refetch. */
export function usePatientPhoto(id: string | undefined, version: string | null | undefined) {
  return useQuery({
    queryKey: patientPhotoKey(id ?? '', version ?? null),
    queryFn: () => patientsService.photo(id!),
    enabled: Boolean(id) && Boolean(version),
    staleTime: Infinity,
  });
}

export function useSetPatientPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: Blob }) => patientsService.setPhoto(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.all }),
  });
}

export function useRemovePatientPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patientsService.removePhoto(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.all }),
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patientsService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.all }),
  });
}

export interface ScanIdCardInput {
  file: File;
  /** False for early auto-scan frames: try the browser only, keep the API for later attempts. */
  allowServer?: boolean;
}

/** ID card OCR following VITE_ID_SCAN_MODE (browser first, API as fallback by default). */
export function useScanIdCard() {
  return useMutation({
    mutationFn: ({ file, allowServer = true }: ScanIdCardInput) =>
      scanIdCardHybrid(file, {
        mode: env.idScanMode,
        clientSupported: isClientScanSupported(),
        allowServer,
        client: scanIdCardOnClient,
        server: (image) => identityService.scan(image),
      }),
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies', 'options'],
    queryFn: () => companiesService.list(),
    staleTime: 5 * 60_000,
  });
}

export function useProvinces() {
  return useQuery({
    queryKey: ['locations', 'provinces'],
    queryFn: () => locationsService.provinces(),
    staleTime: Infinity,
  });
}

export function useDistricts(provinceId: number | null | undefined) {
  return useQuery({
    queryKey: ['locations', 'districts', provinceId],
    queryFn: () => locationsService.districts(provinceId!),
    enabled: Boolean(provinceId),
    staleTime: Infinity,
  });
}

export function useNeighborhoods(districtId: number | null | undefined) {
  return useQuery({
    queryKey: ['locations', 'neighborhoods', districtId],
    queryFn: () => locationsService.neighborhoods(districtId!),
    enabled: Boolean(districtId),
    staleTime: Infinity,
  });
}
