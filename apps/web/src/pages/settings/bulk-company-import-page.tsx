import { useQueryClient } from '@tanstack/react-query';
import { PATHS } from '@/app/router/navigation';
import { companyKeys } from '@/features/companies/use-companies';
import { ImportWizard } from '@/features/imports/import-wizard';
import { companyImportService } from '@/services/import.service';

export function BulkCompanyImportPage() {
  const queryClient = useQueryClient();
  return (
    <ImportWizard
      title="Toplu Firma Aktarma"
      description="Excel/CSV listesinden işveren firmaları doğrulayarak içeri alın. Şube ve işyerleri firma kartından eklenir."
      breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Toplu Firma Aktarma' }]}
      columnsHint="Şablondaki başlıklar: Firma Adı zorunlu; Vergi No, SGK Sicil No, Tehlike Sınıfı (Az Tehlikeli / Tehlikeli / Çok Tehlikeli veya 1/2/3), Telefon, e-Posta, Adres isteğe bağlı. Aynı ad veya vergi numarası atlanır."
      templateFileName="firma-aktarma-sablonu.xlsx"
      service={companyImportService}
      displayColumns={[
        { key: 'name', header: 'Firma' },
        { key: 'taxNumber', header: 'Vergi No', mono: true },
        { key: 'hazardClass', header: 'Tehlike Sınıfı' },
        { key: 'phone', header: 'Telefon' },
      ]}
      noun="firma"
      listPath={PATHS.companies}
      listLabel="Firma listesine git"
      onImported={() => void queryClient.invalidateQueries({ queryKey: companyKeys.all })}
    />
  );
}
