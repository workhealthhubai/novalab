import { classifyMeasurement, measurementDefinition } from '@osgb/shared-types';

/** "80,5 kg" using the catalogue's decimals; empty unit is omitted. */
export function formatMeasurement(key: string, value: number): string {
  const def = measurementDefinition(key);
  const decimals = def?.decimals ?? 1;
  const text = value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return def?.unit ? `${text} ${def.unit}` : text;
}

/** Signed change against the previous column, e.g. "+2,5" / "−1"; null when either side is missing or equal. */
export function formatDelta(
  key: string,
  previous: number | undefined,
  current: number | undefined,
): string | null {
  if (previous === undefined || current === undefined) return null;
  const decimals = measurementDefinition(key)?.decimals ?? 1;
  const diff = Math.round((current - previous) * 10 ** decimals) / 10 ** decimals;
  if (diff === 0) return null;
  const text = Math.abs(diff).toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return diff > 0 ? `+${text}` : `−${text}`;
}

export type Flag = 'LOW' | 'HIGH' | null;

export function flagOf(key: string, value: number | undefined): Flag {
  if (value === undefined) return null;
  const c = classifyMeasurement(key, value);
  return c === 'LOW' || c === 'HIGH' ? c : null;
}

/** Percentage of protocol items completed, for the "tetkikler" row. */
export function itemsProgress(items: ReadonlyArray<{ status: string }>): {
  done: number;
  total: number;
} {
  const active = items.filter((i) => i.status !== 'CANCELLED');
  return { done: active.filter((i) => i.status === 'DONE').length, total: active.length };
}
