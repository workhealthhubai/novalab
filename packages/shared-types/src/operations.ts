import { PERMISSIONS, type Permission } from './permissions';

export type OperationKind = 'lab' | 'isg' | 'templates' | 'accounting' | 'payouts' | 'sub-osgb';
export interface OperationField {
  key: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'date'
    | 'money'
    | 'integer'
    | 'email'
    | 'select'
    | 'protocol'
    | 'company'
    | 'physician';
  required?: boolean;
  options?: readonly string[];
}
export interface OperationDefinition {
  title: string;
  description: string;
  read: Permission;
  write: Permission;
  fields: OperationField[];
  states: readonly string[];
}
const content: OperationField = {
  key: 'content',
  label: 'Rapor içeriği',
  type: 'textarea',
  required: true,
};
export const OPERATION_DEFINITIONS: Record<OperationKind, OperationDefinition> = {
  lab: {
    title: 'Lab. Tahlilleri',
    description: 'Protokole bağlı laboratuvar sonuçlarını kaydedin ve tamamlayın.',
    read: PERMISSIONS.EXAMINATIONS_READ,
    write: PERMISSIONS.EXAMINATIONS_UPDATE,
    states: ['Taslak', 'Tamamlandı'],
    fields: [
      { key: 'protocolId', label: 'Protokol', type: 'protocol', required: true },
      { key: 'laboratory', label: 'Laboratuvar', type: 'text', required: true },
      { key: 'sampleNumber', label: 'Numune / barkod no', type: 'text', required: true },
      { key: 'sampleDate', label: 'Numune tarihi', type: 'date', required: true },
      {
        key: 'content',
        label: 'Sonuçlar (tetkik, değer, birim ve referans aralığı)',
        type: 'textarea',
        required: true,
      },
      { key: 'notes', label: 'Açıklama', type: 'textarea' },
    ],
  },
  isg: {
    title: 'İSG Raporları',
    description:
      'Firma ve dönem bazında İSG değerlendirme raporları; protokole bağlı rapor takibi.',
    read: PERMISSIONS.REPORTS_EXPORT,
    write: PERMISSIONS.REPORTS_EXPORT,
    states: ['Taslak', 'Tamamlandı'],
    fields: [
      { key: 'companyId', label: 'Firma', type: 'company', required: true },
      { key: 'protocolId', label: 'Protokol (isteğe bağlı)', type: 'protocol' },
      { key: 'period', label: 'Rapor dönemi', type: 'text', required: true },
      { key: 'responsible', label: 'Hazırlayan uzman', type: 'text', required: true },
      content,
    ],
  },
  templates: {
    title: 'Rapor Şablonları',
    description:
      'Laboratuvar ve İSG raporlarında kullanmak üzere ortak metin şablonları oluşturun.',
    read: PERMISSIONS.REPORTS_EXPORT,
    write: PERMISSIONS.REPORTS_EXPORT,
    states: ['Aktif', 'Pasif'],
    fields: [
      {
        key: 'category',
        label: 'Rapor türü',
        type: 'select',
        required: true,
        options: ['Laboratuvar', 'İSG'],
      },
      content,
    ],
  },
  accounting: {
    title: 'Ön Muhasebe',
    description: 'Firma bazında gelir, gider, tahsilat ve ödeme takibi. Tutarlar Türk lirasıdır.',
    read: PERMISSIONS.SYSTEM_MANAGE,
    write: PERMISSIONS.SYSTEM_MANAGE,
    states: ['Bekliyor', 'Ödendi'],
    fields: [
      { key: 'companyId', label: 'Firma', type: 'company', required: true },
      {
        key: 'direction',
        label: 'İşlem türü',
        type: 'select',
        required: true,
        options: ['Gelir', 'Gider'],
      },
      { key: 'amount', label: 'Tutar (₺)', type: 'money', required: true },
      { key: 'reference', label: 'Fatura / belge numarası', type: 'text', required: true },
      { key: 'dueDate', label: 'Vade tarihi', type: 'date', required: true },
      { key: 'notes', label: 'Açıklama', type: 'textarea' },
    ],
  },
  payouts: {
    title: 'Doktor Hakediş',
    description: 'Hekim ve dönem bazında hizmet adedi × birim ücret hesabı ve ödeme takibi.',
    read: PERMISSIONS.SYSTEM_MANAGE,
    write: PERMISSIONS.SYSTEM_MANAGE,
    states: ['Bekliyor', 'Ödendi'],
    fields: [
      { key: 'physicianId', label: 'Hekim', type: 'physician', required: true },
      { key: 'period', label: 'Dönem (ör. 2026-09)', type: 'text', required: true },
      { key: 'quantity', label: 'Hizmet adedi', type: 'integer', required: true },
      { key: 'unitPrice', label: 'Birim ücret (₺)', type: 'money', required: true },
      { key: 'notes', label: 'Hizmet / hesaplama açıklaması', type: 'textarea' },
    ],
  },
  'sub-osgb': {
    title: 'Alt OSGB Tanımları',
    description: 'İş birliği yapılan OSGB kurumlarının iletişim ve yetki bilgileri.',
    read: PERMISSIONS.SYSTEM_MANAGE,
    write: PERMISSIONS.SYSTEM_MANAGE,
    states: ['Aktif', 'Pasif'],
    fields: [
      { key: 'authorizationNumber', label: 'Yetki belgesi no', type: 'text', required: true },
      { key: 'taxNumber', label: 'Vergi numarası', type: 'text', required: true },
      { key: 'contact', label: 'Yetkili kişi', type: 'text', required: true },
      { key: 'phone', label: 'Telefon', type: 'text', required: true },
      { key: 'email', label: 'E-posta', type: 'email' },
      { key: 'address', label: 'Adres', type: 'textarea', required: true },
      { key: 'notes', label: 'Açıklama', type: 'textarea' },
    ],
  },
};
export interface OperationInput {
  title: string;
  date: string;
  status: string;
  fields: Record<string, string>;
  version?: number;
}
export interface OperationRecord extends OperationInput {
  references?: Record<string, string>;
  id: string;
  kind: OperationKind;
  version: number;
  amountCents: number | null;
  createdAt: string;
  updatedAt: string;
}
export interface OperationOption {
  id: string;
  label: string;
}
