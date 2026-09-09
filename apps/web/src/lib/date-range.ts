import { format, isValid, parse } from 'date-fns';

const ISO = 'yyyy-MM-dd';
const DISPLAY = 'dd.MM.yyyy';

/** ISO date strings ('' when unset) so callers can pass them straight to list queries. */
export interface DateRangeValue {
  from: string;
  to: string;
}

export function fromIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = parse(value, ISO, new Date());
  return isValid(date) ? date : undefined;
}

/** "01.09.2026 – 09.09.2026"; open-ended ranges keep the dash on the missing side. */
export function formatDateRange(value: DateRangeValue): string {
  const from = fromIsoDate(value.from);
  const to = fromIsoDate(value.to);
  if (from && to) return `${format(from, DISPLAY)} – ${format(to, DISPLAY)}`;
  if (from) return `${format(from, DISPLAY)} –`;
  if (to) return `– ${format(to, DISPLAY)}`;
  return '';
}
