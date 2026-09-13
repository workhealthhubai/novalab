import {
  PERMISSION_DEFINITIONS,
  type Permission,
  type PermissionCategory,
  SYSTEM_ROLES,
  type UserStatus,
} from '@osgb/shared-types';
import type { Status } from '@/design-system/status-badge';

export const USER_STATUS: Record<UserStatus, { label: string; status: Status }> = {
  ACTIVE: { label: 'Aktif', status: 'completed' },
  INVITED: { label: 'Davetli', status: 'waiting' },
  SUSPENDED: { label: 'Askıda', status: 'cancelled' },
  DISABLED: { label: 'Pasif', status: 'cancelled' },
};

/** Built-in roles keep their snake_case key in the API; the UI shows Turkish names. */
export const SYSTEM_ROLE_LABELS: Record<string, string> = {
  [SYSTEM_ROLES.TENANT_ADMIN]: 'Kurum Yöneticisi',
  [SYSTEM_ROLES.OCCUPATIONAL_PHYSICIAN]: 'İşyeri Hekimi',
  [SYSTEM_ROLES.SAFETY_SPECIALIST]: 'İş Güvenliği Uzmanı',
  [SYSTEM_ROLES.NURSE]: 'Sağlık Personeli',
  [SYSTEM_ROLES.COMPANY_REPRESENTATIVE]: 'Firma Yetkilisi',
};

export function roleLabel(name: string): string {
  return (
    SYSTEM_ROLE_LABELS[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export const PERMISSION_CATEGORY_LABELS: Record<PermissionCategory, string> = {
  users: 'Kullanıcılar',
  roles: 'Roller',
  companies: 'Firmalar',
  employees: 'Hastalar',
  workplaces: 'İşyerleri',
  physicians: 'Doktorlar',
  tests: 'Tetkik tanımları',
  occupations: 'Meslek tanımları',
  consents: 'KVKK izinleri',
  protocols: 'Protokoller',
  examinations: 'Muayeneler',
  radiology: 'Radyoloji',
  audiometry: 'Odyometri',
  ecg: 'EKG',
  spirometry: 'Spirometri',
  eye: 'Göz',
  pneumoconiosis: 'Pnömokonyoz',
  appointments: 'Randevular',
  trainings: 'Eğitimler',
  certificates: 'Sertifikalar',
  documents: 'Belgeler',
  reports: 'Raporlar',
  audit: 'Denetim',
  system: 'Sistem',
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'users.read': 'Kullanıcıları görüntüle',
  'users.create': 'Kullanıcı oluştur',
  'users.update': 'Kullanıcı düzenle, rol ata, şifre sıfırla',
  'users.delete': 'Kullanıcı pasife al',
  'roles.read': 'Rolleri ve yetkileri görüntüle',
  'roles.manage': 'Rol oluştur, düzenle, yetki ata',
  'companies.read': 'Firmaları ve şubeleri görüntüle',
  'companies.create': 'Firma ve şube oluştur',
  'companies.update': 'Firma ve şube düzenle',
  'companies.delete': 'Firma ve şube sil',
  'employees.read': 'Hastaları görüntüle',
  'employees.create': 'Hasta kaydı oluştur',
  'employees.update': 'Hasta kaydı düzenle',
  'employees.delete': 'Hasta kaydı sil',
  'workplaces.read': 'İşyerlerini görüntüle',
  'workplaces.manage': 'İşyeri oluştur, düzenle, sil',
  'physicians.read': 'Doktor tanımlarını görüntüle',
  'physicians.manage': 'Doktor ekle, düzenle, imza ve hesap bağla',
  'tests.read': 'Tetkik kataloğunu ve fiyatları görüntüle',
  'tests.manage': 'Tetkik tanımı ekle, düzenle, fiyat değiştir',
  'occupations.read': 'Meslek tanımlarını görüntüle',
  'occupations.manage': 'Meslek ekle, düzenle, sil',
  'consents.read': 'KVKK metinlerini ve hasta rızalarını görüntüle',
  'consents.manage': 'Rıza metni yayınla, rıza kaydet ve geri çek',
  'protocols.read': 'Protokolleri görüntüle',
  'protocols.create': 'Protokol aç',
  'protocols.update': 'Protokol tetkiklerini ve notunu düzenle',
  'protocols.close': 'Protokol kapat, iptal et, yeniden aç',
  'examinations.read': 'Muayeneleri görüntüle (tıbbi veri)',
  'examinations.create': 'Muayene oluştur',
  'examinations.update': 'Muayene bulgularını düzenle (tıbbi veri)',
  'examinations.approve': 'Muayene onayla, uygunluk kararı ver',
  'radiology.read': 'Radyoloji görüntülerini görüntüle (tıbbi veri)',
  'radiology.create': 'Radyoloji isteği oluştur',
  'radiology.report': 'Radyoloji raporu yaz',
  'audiometry.read': 'Odyometri testlerini görüntüle (tıbbi veri)',
  'audiometry.manage': 'Odyometri testi kaydet, düzenle ve sil',
  'ecg.read': 'EKG kayıtlarını görüntüle (tıbbi veri)',
  'ecg.manage': 'EKG kaydet, düzenle, sil ve çıktı ekle',
  'spirometry.read': 'Spirometri testlerini görüntüle (tıbbi veri)',
  'spirometry.manage': 'Spirometri testi kaydet, düzenle, sil ve çıktı ekle',
  'eye.read': 'Göz muayenelerini görüntüle (tıbbi veri)',
  'eye.manage': 'Göz muayenesi kaydet, düzenle ve sil',
  'pneumoconiosis.read': 'ILO pnömokonyoz okumalarını görüntüle (tıbbi veri)',
  'pneumoconiosis.manage': 'ILO okuması kaydet, düzenle ve sil',
  'appointments.read': 'Randevuları görüntüle',
  'appointments.manage': 'Randevu oluştur, düzenle, iptal et',
  'trainings.read': 'Eğitimleri görüntüle',
  'trainings.manage': 'Eğitim planla ve kaydet',
  'certificates.read': 'Sertifikaları görüntüle',
  'certificates.manage': 'Sertifika oluştur ve düzenle',
  'documents.read': 'Belgeleri görüntüle',
  'documents.upload': 'Belge yükle',
  'documents.delete': 'Belge sil',
  'documents.sign': 'Belge imzalat (imza pedi)',
  'reports.export': 'Rapor dışa aktar',
  'audit.read': 'Denetim kayıtlarını görüntüle',
  'system.manage': 'Sistem ayarlarını yönet',
  'tenants.manage': 'Tüm OSGB kiracılarını yönet (Süper Admin)',
};

export interface PermissionGroup {
  category: PermissionCategory;
  label: string;
  permissions: Array<{ key: Permission; label: string; medical: boolean }>;
}

/** Catalogue grouped by category in a fixed order, for the role editor matrix. */
export function permissionGroups(): PermissionGroup[] {
  const order = Object.keys(PERMISSION_CATEGORY_LABELS) as PermissionCategory[];
  return order
    .map((category) => ({
      category,
      label: PERMISSION_CATEGORY_LABELS[category],
      permissions: PERMISSION_DEFINITIONS.filter((p) => p.category === category).map((p) => ({
        key: p.key,
        label: PERMISSION_LABELS[p.key] ?? p.description,
        medical: Boolean(p.medical),
      })),
    }))
    .filter((group) => group.permissions.length > 0);
}
