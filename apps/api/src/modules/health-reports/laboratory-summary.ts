import type { Prisma } from '@/generated/prisma/client';

export function laboratoryLines(fields: Prisma.JsonValue): string[] {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return [];
  const text = (key: string) => (typeof fields[key] === 'string' ? fields[key].trim() : '');
  if (!text('content')) return [];
  return [
    text('laboratory') && `Laboratuvar: ${text('laboratory')}`,
    text('sampleNumber') && `Numune: ${text('sampleNumber')}`,
    text('sampleDate') && `Numune tarihi: ${text('sampleDate')}`,
    ...text('content').split(/\r?\n/),
    text('notes') && `Açıklama: ${text('notes')}`,
  ].filter(Boolean);
}
