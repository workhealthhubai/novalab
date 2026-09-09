import { useQueryClient } from '@tanstack/react-query';
import { PATHS } from '@/app/router/navigation';
import { ImportWizard } from '@/features/imports/import-wizard';
import { patientKeys } from '@/features/patients/use-patients';
import { patientImportService } from '@/services/import.service';

export function BulkPatientImportPage() {
  const queryClient = useQueryClient();
  return (
    <ImportWizard
      title="Toplu Hasta Aktarma"
      description="Excel/CSV listesinden hasta kayıtlarını doğrulayarak içeri alın. Önce önizleme, sonra aktarma."
      breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Toplu Hasta Aktarma' }]}
      columnsHint="Şablondaki başlıklar: TC Kimlik No, Ad, Soyad, Doğum Tarihi (gg.aa.yyyy), GSM zorunlu; Firma ve Meslek ad ya da kodla eşleştirilir."
      templateFileName="hasta-aktarma-sablonu.xlsx"
      service={patientImportService}
      displayColumns={[
        { key: 'fullName', header: 'Ad Soyad' },
        { key: 'nationalId', header: 'TC Kimlik No', mono: true },
        { key: 'company', header: 'Firma' },
        { key: 'occupation', header: 'Meslek' },
      ]}
      noun="hasta"
      listPath={PATHS.patients}
      listLabel="Hasta listesine git"
      onImported={() => void queryClient.invalidateQueries({ queryKey: patientKeys.all })}
    />
  );
}
