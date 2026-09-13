import { randomUUID } from 'node:crypto';
import type { RadiologyModality } from '@/generated/prisma/client';

export interface WorklistPatient {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  gender: string | null;
}

export interface WorklistOrder {
  accessionNumber: string;
  modality: RadiologyModality;
  bodyPart: string | null;
  clinicalInfo: string | null;
  requestedAt: Date;
  scheduledStationAet: string;
}

export interface OrthancWorklistPayload {
  Tags: Record<string, unknown>;
}

/** DICOM Accession Number has SH VR (16 characters maximum). */
export function createAccessionNumber(): string {
  return `NL${randomUUID().replaceAll('-', '').slice(0, 14).toUpperCase()}`;
}

function dicomDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function dicomTime(date: Date): string {
  return date.toISOString().slice(11, 19).replaceAll(':', '');
}

function dicomText(value: string, max: number): string {
  return value
    .replace(/[\\\r\n]/g, ' ')
    .trim()
    .slice(0, max);
}

function patientSex(gender: string | null): string {
  if (gender === 'MALE') return 'M';
  if (gender === 'FEMALE') return 'F';
  return 'O';
}

export function buildOrthancWorklist(
  patient: WorklistPatient,
  order: WorklistOrder,
): OrthancWorklistPayload {
  const description = dicomText([order.modality, order.bodyPart].filter(Boolean).join(' '), 64);
  return {
    Tags: {
      SpecificCharacterSet: 'ISO_IR 192',
      PatientID: patient.id,
      PatientName: `${dicomText(patient.lastName, 64)}^${dicomText(patient.firstName, 64)}`,
      ...(patient.birthDate ? { PatientBirthDate: dicomDate(patient.birthDate) } : {}),
      PatientSex: patientSex(patient.gender),
      AccessionNumber: order.accessionNumber,
      RequestedProcedureID: order.accessionNumber,
      RequestedProcedureDescription: description,
      ...(order.clinicalInfo
        ? { ReasonForTheRequestedProcedure: dicomText(order.clinicalInfo, 64) }
        : {}),
      ScheduledProcedureStepSequence: [
        {
          ScheduledStationAETitle: order.scheduledStationAet,
          ScheduledProcedureStepStartDate: dicomDate(order.requestedAt),
          ScheduledProcedureStepStartTime: dicomTime(order.requestedAt),
          Modality: order.modality,
          ScheduledProcedureStepID: order.accessionNumber,
          ScheduledProcedureStepDescription: description,
        },
      ],
    },
  };
}
