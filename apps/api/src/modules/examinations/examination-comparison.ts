import { computeBmi, MEASUREMENT_KEYS } from '@osgb/shared-types';

export interface MeasurementValue {
  value: number;
  note: string | null;
  recordedAt: Date;
}

/** Stored rows → map by key, with the derived BMI added when height and weight exist. */
export function toMeasurementMap(
  rows: ReadonlyArray<{ key: string; value: unknown; note: string | null; recordedAt: Date }>,
): Record<string, MeasurementValue> {
  const map: Record<string, MeasurementValue> = {};
  for (const row of rows)
    map[row.key] = { value: Number(row.value), note: row.note, recordedAt: row.recordedAt };
  const bmi = computeBmi(map.HEIGHT?.value, map.WEIGHT?.value);
  if (bmi !== undefined) {
    const latest = [map.HEIGHT!, map.WEIGHT!].sort(
      (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
    )[0]!;
    map.BMI = { value: bmi, note: null, recordedAt: latest.recordedAt };
  }
  return map;
}

/** Keys present in any of the maps, in catalogue order. */
export function presentKeys(maps: ReadonlyArray<Record<string, MeasurementValue>>): string[] {
  const present = new Set(maps.flatMap((m) => Object.keys(m)));
  return MEASUREMENT_KEYS.filter((k) => present.has(k));
}

/** Examination date used for ordering: performed, else scheduled, else created. */
export function examinationDate(e: {
  performedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
}): Date {
  return e.performedAt ?? e.scheduledAt ?? e.createdAt;
}
