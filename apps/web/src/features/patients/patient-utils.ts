import type { Patient } from '@/types/patient';
import type { PatientFormValues } from './patient-schema';

export function patientPath(id: string): string {
  return `/patient-registration/patients/${id}`;
}

export function patientEditPath(id: string): string {
  return `/patient-registration/patients/${id}/edit`;
}

/** "10000000146" -> "100*****146" for list views. */
export function maskNationalId(value: string | null | undefined): string {
  if (!value) return '—';
  return `${value.slice(0, 3)}*****${value.slice(-3)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('tr-TR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('tr-TR');
}

/** Maps an API record to form values (nulls become empty strings). */
export function toFormValues(patient: Patient): PatientFormValues {
  return {
    companyId: patient.companyId ?? '',
    occupationId: patient.occupationId ?? '',
    nationalId: patient.nationalId ?? '',
    registrationNumber: patient.registrationNumber ?? '',
    passportNumber: patient.passportNumber ?? '',
    firstName: patient.firstName,
    lastName: patient.lastName,
    birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : '',
    gender: patient.gender ?? '',
    motherName: patient.motherName ?? '',
    fatherName: patient.fatherName ?? '',
    phone: patient.phone ?? '',
    homePhone: patient.homePhone ?? '',
    email: patient.email ?? '',
    addressProvinceId: patient.addressProvinceId,
    addressDistrictId: patient.addressDistrictId,
    addressNeighborhoodId: patient.addressNeighborhoodId,
    addressLine: patient.addressLine ?? '',
    notes: patient.notes ?? '',
    status: patient.status,
  };
}
