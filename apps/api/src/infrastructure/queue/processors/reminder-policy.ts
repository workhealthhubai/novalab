export const REMINDER_DAYS = [30, 7, 1, 0, -7] as const;
const DAY = 86_400_000;
export function dueReminder(due: Date | null, now = new Date()) {
  if (!due) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const dueDate = due.toISOString().slice(0, 10);
  const daysUntil = Math.round((Date.parse(dueDate) - Date.parse(today)) / DAY);
  const stage = REMINDER_DAYS.filter((threshold) => daysUntil <= threshold).at(-1);
  return stage === undefined ? null : { dueDate, daysUntil, stage };
}
