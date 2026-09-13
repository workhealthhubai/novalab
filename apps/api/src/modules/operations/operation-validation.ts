import { OPERATION_DEFINITIONS, type OperationInput, type OperationKind } from '@osgb/shared-types';

export function isOperationKind(value: string): value is OperationKind {
  return Object.hasOwn(OPERATION_DEFINITIONS, value);
}
export function moneyCents(value: string): number {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value))
    throw new Error('Tutar pozitif ve en fazla iki ondalık basamaklı olmalı.');
  const [whole = '0', fraction = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents <= 0 || cents > 2_000_000_000) throw new Error('Tutar izin verilen aralığın dışında.');
  return cents;
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function validateOperation(kind: OperationKind, input: OperationInput) {
  const definition = OPERATION_DEFINITIONS[kind];
  if (!input.title?.trim() || input.title.length > 200)
    throw new Error('Başlık 1–200 karakter olmalı.');
  if (!validDate(input.date)) throw new Error('Geçerli bir kayıt tarihi girin.');
  if (!definition.states.includes(input.status)) throw new Error('Geçersiz durum.');
  const fields: Record<string, string> = {};
  for (const field of definition.fields) {
    const raw = input.fields[field.key] ?? '';
    if (typeof raw !== 'string') throw new Error(`${field.label}: metin bekleniyor.`);
    const value = raw.trim();
    if (field.required && !value) throw new Error(`${field.label} zorunludur.`);
    if (value.length > (field.type === 'textarea' ? 20000 : 250))
      throw new Error(`${field.label} çok uzun.`);
    if (value) {
      if (field.type === 'date' && !validDate(value))
        throw new Error(`${field.label}: geçersiz tarih.`);
      if (field.type === 'money') moneyCents(value);
      if (
        field.type === 'integer' &&
        (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100000)
      )
        throw new Error(`${field.label}: 1–100000 arasında tam sayı girin.`);
      if (field.type === 'select' && !field.options?.includes(value))
        throw new Error(`${field.label}: geçersiz seçim.`);
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        throw new Error('Geçerli bir e-posta girin.');
      if (
        ['protocol', 'company', 'physician'].includes(field.type) &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
      )
        throw new Error(`${field.label}: geçersiz kayıt.`);
    }
    fields[field.key] = value;
  }
  if (
    Object.keys(input.fields).some((key) => !definition.fields.some((field) => field.key === key))
  )
    throw new Error('Bilinmeyen kayıt alanı.');
  if (kind === 'sub-osgb' && !/^\d{10}$/.test(fields.taxNumber ?? ''))
    throw new Error('Vergi numarası 10 haneli olmalı.');
  if (kind === 'payouts' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(fields.period ?? ''))
    throw new Error('Dönemi YYYY-AA biçiminde girin.');
  const amountCents =
    kind === 'accounting'
      ? moneyCents(fields.amount!)
      : kind === 'payouts'
        ? moneyCents(fields.unitPrice!) * Number(fields.quantity)
        : null;
  if (amountCents !== null && amountCents > 2_000_000_000)
    throw new Error('Toplam tutar izin verilen aralığın dışında.');
  return {
    title: input.title.trim(),
    date: new Date(input.date),
    status: input.status,
    fields,
    amountCents,
    protocolId: fields.protocolId || null,
  };
}
export function isLocked(kind: OperationKind, status: string) {
  return (
    (['lab', 'isg'].includes(kind) && status === 'Tamamlandı') ||
    (['accounting', 'payouts'].includes(kind) && status === 'Ödendi')
  );
}
