import { BadRequestException } from '@nestjs/common';
import {
  AlcoholHabit,
  type Anamnesis,
  BODY_SYSTEM_KEYS,
  EXPOSURE_KEYS,
  SmokingHabit,
  SystemStatus,
  type SystemsExam,
} from '@osgb/shared-types';

const TEXT_FIELDS = [
  'complaints',
  'pastIllnesses',
  'surgeries',
  'familyHistory',
  'medications',
  'allergies',
  'occupationalHistory',
] as const;

function text(value: unknown, field: string, max = 2000): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string')
    throw new BadRequestException({
      message: `${field} must be text`,
      errorCode: 'REPORT_INVALID',
    });
  return value.trim().slice(0, max) || null;
}

/** Whitelists the anamnesis JSON against the shared shape. */
export function normalizeAnamnesis(input: unknown): Anamnesis {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException({
      message: 'anamnesis must be an object',
      errorCode: 'REPORT_INVALID',
    });
  const raw = input as Record<string, unknown>;
  const out: Anamnesis = {};
  for (const field of TEXT_FIELDS) out[field] = text(raw[field], field);
  const smoking = raw.smoking;
  if (smoking !== null && smoking !== undefined) {
    if (typeof smoking !== 'string' || !(smoking in SmokingHabit))
      throw new BadRequestException({ message: 'smoking is invalid', errorCode: 'REPORT_INVALID' });
    out.smoking = smoking as Anamnesis['smoking'];
  } else out.smoking = null;
  const alcohol = raw.alcohol;
  if (alcohol !== null && alcohol !== undefined) {
    if (typeof alcohol !== 'string' || !(alcohol in AlcoholHabit))
      throw new BadRequestException({ message: 'alcohol is invalid', errorCode: 'REPORT_INVALID' });
    out.alcohol = alcohol as Anamnesis['alcohol'];
  } else out.alcohol = null;
  const packYears = raw.packYears;
  if (packYears !== null && packYears !== undefined && packYears !== '') {
    const n = Number(packYears);
    if (!Number.isFinite(n) || n < 0 || n > 300)
      throw new BadRequestException({
        message: 'packYears is invalid',
        errorCode: 'REPORT_INVALID',
      });
    out.packYears = Math.round(n * 10) / 10;
  } else out.packYears = null;
  const exposures = raw.exposures ?? [];
  if (
    !Array.isArray(exposures) ||
    exposures.some((e) => typeof e !== 'string' || !EXPOSURE_KEYS.includes(e))
  )
    throw new BadRequestException({
      message: 'exposures contain an unknown key',
      errorCode: 'REPORT_INVALID',
    });
  out.exposures = [...new Set(exposures as string[])];
  return out;
}

/** Whitelists the per-system examination JSON. */
export function normalizeSystemsExam(input: unknown): SystemsExam {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException({
      message: 'systemsExam must be an object',
      errorCode: 'REPORT_INVALID',
    });
  const out: SystemsExam = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!BODY_SYSTEM_KEYS.includes(key))
      throw new BadRequestException({
        message: `Unknown system ${key}`,
        errorCode: 'REPORT_INVALID',
      });
    if (typeof value !== 'object' || value === null)
      throw new BadRequestException({
        message: `${key} must be an object`,
        errorCode: 'REPORT_INVALID',
      });
    const finding = value as Record<string, unknown>;
    const status = finding.status;
    if (typeof status !== 'string' || !(status in SystemStatus))
      throw new BadRequestException({
        message: `${key}.status is invalid`,
        errorCode: 'REPORT_INVALID',
      });
    out[key as keyof SystemsExam] = {
      status: status as SystemStatus,
      note: text(finding.note, `${key}.note`, 500),
    };
  }
  return out;
}
