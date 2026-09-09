import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AppButton } from '@/design-system/app-button';
import { FormField } from '@/design-system/form-field';
import { toApiError } from '@/services/api-client';
import type { Occupation } from '@/types/occupation';
import {
  emptyOccupationForm,
  type OccupationFormValues,
  occupationSchema,
  toOccupationForm,
} from './occupation-schema';

interface OccupationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occupation: Occupation | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: OccupationFormValues) => void;
}

export function OccupationDialog({
  open,
  onOpenChange,
  occupation,
  submitting,
  error,
  onSubmit,
}: OccupationDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OccupationFormValues>({
    resolver: zodResolver(occupationSchema),
    defaultValues: occupation ? toOccupationForm(occupation) : emptyOccupationForm,
    mode: 'onBlur',
  });
  useEffect(() => {
    if (open) reset(occupation ? toOccupationForm(occupation) : emptyOccupationForm);
  }, [open, occupation, reset]);
  const apiError = error ? toApiError(error) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {occupation ? `Mesleği Düzenle · ${occupation.name}` : 'Yeni Meslek'}
          </DialogTitle>
          <DialogDescription>
            Hasta kaydında seçilir; kod ISCO-08 ya da SGK meslek kodu olabilir.
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
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="occ-code" label="Kod" error={errors.code?.message} hint="İsteğe bağlı">
              <Input
                id="occ-code"
                className="font-mono"
                placeholder="7212"
                aria-invalid={errors.code ? true : undefined}
                {...register('code')}
              />
            </FormField>
            <FormField
              id="occ-name"
              label="Meslek Adı"
              required
              error={errors.name?.message}
              className="sm:col-span-2"
            >
              <Input
                id="occ-name"
                autoFocus
                aria-invalid={errors.name ? true : undefined}
                {...register('name')}
              />
            </FormField>
            <FormField
              id="occ-description"
              label="Açıklama"
              error={errors.description?.message}
              className="sm:col-span-3"
            >
              <Textarea
                id="occ-description"
                rows={2}
                placeholder="Tipik tehlikeler, notlar…"
                {...register('description')}
              />
            </FormField>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <FormField id="occ-active" label="Durum" className="sm:col-span-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="occ-active"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    <Label htmlFor="occ-active" className="cursor-pointer text-sm font-normal">
                      Aktif (hasta kaydında seçilebilir)
                    </Label>
                  </div>
                </FormField>
              )}
            />
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
              {occupation ? 'Kaydet' : 'Mesleği Kaydet'}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
