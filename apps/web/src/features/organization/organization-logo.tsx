import { ImageUp, Trash2 } from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useRef } from 'react';
import { AppButton } from '@/design-system/app-button';
import { toast } from '@/design-system/toast';
import { toApiError } from '@/services/api-client';
import { useOrganizationLogo, useOrganizationMutations } from './use-organization';

interface OrganizationLogoProps {
  logoUpdatedAt: string | null;
  canEdit: boolean;
  name: string;
}

/** Logo preview with upload/remove; the file is normalised to PNG by the API. */
export function OrganizationLogo({ logoUpdatedAt, canEdit, name }: OrganizationLogoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const logo = useOrganizationLogo(logoUpdatedAt);
  const { setLogo, removeLogo } = useOrganizationMutations();
  const url = useMemo(() => (logo.data ? URL.createObjectURL(logo.data) : null), [logo.data]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogo.mutate(file, {
      onSuccess: () => toast.success('Logo güncellendi'),
      onError: (error) => toast.error('Logo yüklenemedi', toApiError(error).message),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 p-2">
        {url ? (
          <img src={url} alt={`${name} logosu`} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Logo yok</span>
        )}
      </div>
      {canEdit ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={handleFile}
              aria-label="Logo dosyası seç"
            />
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              loading={setLogo.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <ImageUp />
              Logo Yükle
            </AppButton>
            {logoUpdatedAt ? (
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                loading={removeLogo.isPending}
                onClick={() =>
                  removeLogo.mutate(undefined, {
                    onSuccess: () => toast.success('Logo kaldırıldı'),
                    onError: (error) => toast.error('Kaldırılamadı', toApiError(error).message),
                  })
                }
              >
                <Trash2 />
                Kaldır
              </AppButton>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPEG, WebP veya SVG; en fazla 5 MB. Raporların başlığında kullanılır.
          </p>
        </div>
      ) : null}
    </div>
  );
}
