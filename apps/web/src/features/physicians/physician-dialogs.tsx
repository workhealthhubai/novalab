import { zodResolver } from '@hookform/resolvers/zod';
import { ImageUp, Trash2 } from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AppButton } from '@/design-system/app-button';
import { Combobox } from '@/design-system/combobox';
import { FormField } from '@/design-system/form-field';
import { toast } from '@/design-system/toast';
import { useUsers } from '@/features/users/use-users';
import { toApiError } from '@/services/api-client';
import type { Physician } from '@/types/physician';
import { PHYSICIAN_STATUS, physicianDisplayName, SPECIALTIES, TITLES } from './physician-labels';
import {
  emptyPhysicianForm,
  type PhysicianFormValues,
  physicianSchema,
  toPhysicianForm,
} from './physician-schema';
import { usePhysicianMutations, usePhysicianSignature } from './use-physicians';

interface PhysicianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  physician: Physician | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: PhysicianFormValues) => void;
}

const NONE = '__none__';

export function PhysicianDialog({
  open,
  onOpenChange,
  physician,
  submitting,
  error,
  onSubmit,
}: PhysicianDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PhysicianFormValues>({
    resolver: zodResolver(physicianSchema),
    defaultValues: physician ? toPhysicianForm(physician) : emptyPhysicianForm,
    mode: 'onBlur',
  });
  useEffect(() => {
    if (open) reset(physician ? toPhysicianForm(physician) : emptyPhysicianForm);
  }, [open, physician, reset]);
  const users = useUsers({ pageSize: 100 });
  const userOptions = useMemo(
    () =>
      (users.data?.items ?? []).map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName} · ${u.email}`,
      })),
    [users.data],
  );
  const specialty = useWatch({ control, name: 'specialty' });
  const apiError = error ? toApiError(error) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {physician ? `Doktoru Düzenle · ${physicianDisplayName(physician)}` : 'Yeni Doktor'}
          </DialogTitle>
          <DialogDescription>
            Raporlarda ad, unvan ve belge numaraları bu kayıttan alınır. Giriş hesabı bağlanırsa
            muayeneler o kullanıcıya atanır.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit(onSubmit)();
          }}
        >
          {apiError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
            >
              {apiError.message}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <FormField id="phy-title" label="Unvan">
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                  >
                    <SelectTrigger id="phy-title">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Unvan yok —</SelectItem>
                      {TITLES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField id="phy-firstName" label="Adı" required error={errors.firstName?.message}>
              <Input
                id="phy-firstName"
                autoFocus
                aria-invalid={errors.firstName ? true : undefined}
                {...register('firstName')}
              />
            </FormField>
            <FormField id="phy-lastName" label="Soyadı" required error={errors.lastName?.message}>
              <Input
                id="phy-lastName"
                aria-invalid={errors.lastName ? true : undefined}
                {...register('lastName')}
              />
            </FormField>
            <FormField
              id="phy-specialty"
              label="Branş"
              error={errors.specialty?.message}
              hint="Listeden seçin veya yazın"
            >
              <Input id="phy-specialty" list="phy-specialty-options" {...register('specialty')} />
              <datalist id="phy-specialty-options">
                {SPECIALTIES.filter((s) => s !== specialty).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </FormField>
            <FormField id="phy-diploma" label="Diploma No" error={errors.diplomaNumber?.message}>
              <Input id="phy-diploma" {...register('diplomaNumber')} />
            </FormField>
            <FormField
              id="phy-tescil"
              label="Diploma Tescil No"
              error={errors.diplomaRegistrationNumber?.message}
            >
              <Input id="phy-tescil" {...register('diplomaRegistrationNumber')} />
            </FormField>
            <FormField
              id="phy-cert"
              label="İşyeri Hekimliği Belge No"
              error={errors.certificateNumber?.message}
            >
              <Input id="phy-cert" {...register('certificateNumber')} />
            </FormField>
            <FormField id="phy-phone" label="Telefon" error={errors.phone?.message}>
              <Input id="phy-phone" inputMode="tel" {...register('phone')} />
            </FormField>
            <FormField id="phy-email" label="e-Posta" error={errors.email?.message}>
              <Input
                id="phy-email"
                type="email"
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
            </FormField>
            <Controller
              control={control}
              name="userId"
              render={({ field }) => (
                <FormField
                  id="phy-user"
                  label="Giriş Hesabı"
                  className="sm:col-span-2"
                  hint="Personel Tanımları'ndaki bir kullanıcı; boş bırakılabilir."
                >
                  <Combobox
                    id="phy-user"
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? '')}
                    options={userOptions}
                    loading={users.isPending}
                    placeholder="Hesap bağla (isteğe bağlı)"
                    searchPlaceholder="Ad veya e-posta…"
                  />
                </FormField>
              )}
            />
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <FormField id="phy-status" label="Durum">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="phy-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PHYSICIAN_STATUS) as Array<keyof typeof PHYSICIAN_STATUS>).map(
                        (s) => (
                          <SelectItem key={s} value={s}>
                            {PHYSICIAN_STATUS[s].label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField
              id="phy-notes"
              label="Not"
              error={errors.notes?.message}
              className="sm:col-span-2 lg:col-span-3"
            >
              <Textarea id="phy-notes" rows={2} {...register('notes')} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Vazgeç
            </AppButton>
            <AppButton type="submit" loading={submitting}>
              {physician ? 'Kaydet' : 'Doktoru Kaydet'}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  physician: Physician | null;
}

/** Signature image preview with upload/remove; stored as trimmed PNG by the API. */
export function SignatureDialog({ open, onOpenChange, physician }: SignatureDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const signature = usePhysicianSignature(physician?.id, physician?.signatureUpdatedAt);
  const { setSignature, removeSignature } = usePhysicianMutations();
  const url = useMemo(
    () => (signature.data ? URL.createObjectURL(signature.data) : null),
    [signature.data],
  );
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !physician) return;
    setSignature.mutate(
      { id: physician.id, file },
      {
        onSuccess: () => toast.success('İmza güncellendi'),
        onError: (error) => toast.error('İmza yüklenemedi', toApiError(error).message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {physician ? `İmza · ${physicianDisplayName(physician)}` : 'İmza'}
          </DialogTitle>
          <DialogDescription>
            Beyaz zemin üzerine atılmış imzanın fotoğrafı veya taraması; kenarlar otomatik kırpılır,
            raporlara basılır.
          </DialogDescription>
        </DialogHeader>
        <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-muted/40 p-3">
          {url ? (
            <img src={url} alt="İmza" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {signature.isPending && physician?.signatureUpdatedAt
                ? 'Yükleniyor…'
                : 'İmza yüklenmemiş'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleFile}
            aria-label="İmza dosyası seç"
          />
          {physician?.signatureUpdatedAt ? (
            <AppButton
              variant="ghost"
              loading={removeSignature.isPending}
              onClick={() =>
                physician &&
                removeSignature.mutate(physician.id, {
                  onSuccess: () => toast.success('İmza kaldırıldı'),
                  onError: (error) => toast.error('Kaldırılamadı', toApiError(error).message),
                })
              }
            >
              <Trash2 />
              Kaldır
            </AppButton>
          ) : null}
          <AppButton
            variant="secondary"
            loading={setSignature.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <ImageUp />
            {physician?.signatureUpdatedAt ? 'Değiştir' : 'İmza Yükle'}
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
