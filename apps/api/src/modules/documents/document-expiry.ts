import type { Prisma } from '@/generated/prisma/client';

export function documentExpiryWhere(expiry?: string, now = new Date()): Prisma.DocumentWhereInput {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const today = new Date(`${day}T00:00:00.000Z`);
  if (expiry === 'undated') return { expiresAt: null };
  if (expiry === 'overdue') return { expiresAt: { lt: today } };
  if (expiry && ['30', '60', '90'].includes(expiry)) {
    const until = new Date(today);
    until.setUTCDate(until.getUTCDate() + Number(expiry));
    return { expiresAt: { gte: today, lte: until } };
  }
  return {};
}
