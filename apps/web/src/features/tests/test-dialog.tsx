import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AppButton } from '@/design-system/app-button';
import { FormField } from '@/design-system/form-field';
import { toApiError } from '@/services/api-client';
import type { TestDefinition } from '@/types/test-definition';
import {
  formatPrice,
  grossPrice,
  TEST_CATEGORIES,
  TEST_CATEGORY_LABELS,
  VAT_RATES,
} from './test-labels';
import { emptyTestForm, type TestFormValues, testSchema, toTestForm } from './test-schema';

interface TestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: TestDefinition | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: TestFormValues) => void;
}

export function TestDialog({
  open,
  onOpenChange,
  test,
  submitting,
  error,
  onSubmit,
}: TestDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: test ? toTestForm(test) : emptyTestForm,
    mode: 'onBlur',
  });
  useEffect(() => {
    if (open) reset(test ? toTestForm(test) : emptyTestForm);
  }, [open, test, reset]);
  const [category, unitPrice, vatRate] = useWatch({
    control,
    name: ['category', 'unitPrice', 'vatRate'],
  });
  const net = Number(unitPrice.replace(',', '.'));
  const gross =
    Number.isFinite(net) && unitPrice.trim() !== '' ? grossPrice(net, Number(vatRate)) : null;
  const apiError = error ? toApiError(error) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>{test ? `Tetkiği Düzenle · ${test.name}` : 'Yeni Tetkik'}</DialogTitle>
          <DialogDescription>
            Kod kurum içinde benzersizdir ve büyük harfe çevrilir. Fiyat KDV hariç liste fiyatıdır.
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
            <FormField
              id="test-code"
              label="Kod"
              required
              error={errors.code?.message}
              hint="Örn. LAB-HGB"
            >
              <Input
                id="test-code"
                autoFocus
                className="font-mono uppercase"
                aria-invalid={errors.code ? true : undefined}
                {...register('code')}
              />
            </FormField>
            <FormField
              id="test-name"
              label="Tetkik Adı"
              required
              error={errors.name?.message}
              className="sm:col-span-1 lg:col-span-2"
            >
              <Input
                id="test-name"
                aria-invalid={errors.name ? true : undefined}
                {...register('name')}
              />
            </FormField>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <FormField
                  id="test-category"
                  label="Kategori"
                  required
                  hint="Hangi doktor modülü ekranında sonuçlanır"
                >
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="test-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {TEST_CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField
              id="test-price"
              label="Liste Fiyatı (KDV hariç)"
              error={errors.unitPrice?.message}
              hint={gross !== null ? `KDV dahil ${formatPrice(gross)}` : 'TL'}
            >
              <Input
                id="test-price"
                inputMode="decimal"
                placeholder="0,00"
                aria-invalid={errors.unitPrice ? true : undefined}
                {...register('unitPrice')}
              />
            </FormField>
            <Controller
              control={control}
              name="vatRate"
              render={({ field }) => (
                <FormField id="test-vat" label="KDV">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="test-vat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VAT_RATES.map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>
                          %{rate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField id="test-duration" label="Süre (dk)" error={errors.durationMinutes?.message}>
              <Input id="test-duration" inputMode="numeric" {...register('durationMinutes')} />
            </FormField>
            <FormField
              id="test-order"
              label="Sıra"
              error={errors.sortOrder?.message}
              hint="Listelerde küçük sayı önce"
            >
              <Input id="test-order" inputMode="numeric" {...register('sortOrder')} />
            </FormField>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <FormField id="test-active" label="Durum">
                  <div className="flex h-input items-center gap-2">
                    <Checkbox
                      id="test-active"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    <Label htmlFor="test-active" className="cursor-pointer text-sm font-normal">
                      Aktif (protokolde seçilebilir)
                    </Label>
                  </div>
                </FormField>
              )}
            />
            {category === 'LAB' ? (
              <>
                <FormField
                  id="test-sample"
                  label="Numune"
                  error={errors.sampleType?.message}
                  hint="Kan, idrar, serum…"
                >
                  <Input id="test-sample" {...register('sampleType')} />
                </FormField>
                <FormField
                  id="test-unit"
                  label="Birim"
                  error={errors.unit?.message}
                  hint="g/dL, mg/dL…"
                >
                  <Input id="test-unit" {...register('unit')} />
                </FormField>
                <FormField
                  id="test-range"
                  label="Referans Aralığı"
                  error={errors.referenceRange?.message}
                  hint="12-16 g/dL gibi"
                >
                  <Input id="test-range" {...register('referenceRange')} />
                </FormField>
              </>
            ) : null}
            <FormField
              id="test-notes"
              label="Not"
              error={errors.notes?.message}
              className="sm:col-span-2 lg:col-span-3"
            >
              <Textarea id="test-notes" rows={2} {...register('notes')} />
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
              {test ? 'Kaydet' : 'Tetkiği Kaydet'}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
