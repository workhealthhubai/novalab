import { zodResolver } from '@hookform/resolvers/zod';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import {
  formatPrice,
  grossPrice,
  TEST_CATEGORIES,
  TEST_CATEGORY_LABELS,
  VAT_RATES,
} from '@/features/tests/test-labels';
import { useTests } from '@/features/tests/use-tests';
import { foldSearch } from '@/lib/search';
import { toApiError } from '@/services/api-client';
import type { TestPackage } from '@/types/test-package';
import {
  emptyPackageForm,
  type PackageFormValues,
  packageSchema,
  toPackageForm,
} from './package-schema';

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: TestPackage | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: PackageFormValues) => void;
}

export function PackageDialog({
  open,
  onOpenChange,
  pkg,
  submitting,
  error,
  onSubmit,
}: PackageDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: pkg ? toPackageForm(pkg) : emptyPackageForm,
    mode: 'onBlur',
  });
  useEffect(() => {
    if (open) reset(pkg ? toPackageForm(pkg) : emptyPackageForm);
  }, [open, pkg, reset]);
  const [filter, setFilter] = useState('');
  const catalogue = useTests({ pageSize: 100, isActive: true }, open);
  const tests = useMemo(() => catalogue.data?.items ?? [], [catalogue.data]);
  const [testIds, price, vatRate] = useWatch({ control, name: ['testIds', 'price', 'vatRate'] });
  const selected = useMemo(() => tests.filter((t) => testIds.includes(t.id)), [tests, testIds]);
  const itemsNet = selected.reduce((sum, t) => sum + Number(t.unitPrice), 0);
  const itemsGross = selected.reduce((sum, t) => sum + grossPrice(t.unitPrice, t.vatRate), 0);
  const packageNet = price.trim() === '' ? null : Number(price.replace(',', '.'));
  const needle = foldSearch(filter.trim());
  const visible = needle
    ? tests.filter((t) => foldSearch(`${t.code} ${t.name}`).includes(needle))
    : tests;
  const apiError = error ? toApiError(error) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[880px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>{pkg ? `Paketi Düzenle · ${pkg.name}` : 'Yeni Paket'}</DialogTitle>
          <DialogDescription>
            Paket fiyatı boş bırakılırsa tetkiklerin liste fiyatları toplanır. Protokol açarken
            paket seçildiğinde tetkikler otomatik işaretlenir.
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField id="pkg-code" label="Kod" required error={errors.code?.message}>
              <Input
                id="pkg-code"
                autoFocus
                className="font-mono uppercase"
                aria-invalid={errors.code ? true : undefined}
                {...register('code')}
              />
            </FormField>
            <FormField
              id="pkg-name"
              label="Paket Adı"
              required
              error={errors.name?.message}
              className="sm:col-span-1 lg:col-span-3"
            >
              <Input
                id="pkg-name"
                placeholder="İşe Giriş Standart"
                aria-invalid={errors.name ? true : undefined}
                {...register('name')}
              />
            </FormField>
            <FormField
              id="pkg-price"
              label="Paket Fiyatı (KDV hariç)"
              error={errors.price?.message}
              hint={
                packageNet !== null && Number.isFinite(packageNet)
                  ? `KDV dahil ${formatPrice(grossPrice(packageNet, Number(vatRate)))}`
                  : `Boş: tetkik toplamı ${formatPrice(itemsNet)}`
              }
            >
              <Input
                id="pkg-price"
                inputMode="decimal"
                placeholder="Boş = tetkik toplamı"
                aria-invalid={errors.price ? true : undefined}
                {...register('price')}
              />
            </FormField>
            <Controller
              control={control}
              name="vatRate"
              render={({ field }) => (
                <FormField id="pkg-vat" label="Paket KDV" hint="Yalnızca paket fiyatı için">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pkg-vat">
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
            <FormField id="pkg-order" label="Sıra" error={errors.sortOrder?.message}>
              <Input id="pkg-order" inputMode="numeric" {...register('sortOrder')} />
            </FormField>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <FormField id="pkg-active" label="Durum">
                  <div className="flex h-input items-center gap-2">
                    <Checkbox
                      id="pkg-active"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    <Label htmlFor="pkg-active" className="cursor-pointer text-sm font-normal">
                      Aktif
                    </Label>
                  </div>
                </FormField>
              )}
            />
            <FormField
              id="pkg-description"
              label="Açıklama"
              error={errors.description?.message}
              className="sm:col-span-2 lg:col-span-4"
            >
              <Textarea id="pkg-description" rows={2} {...register('description')} />
            </FormField>
          </div>

          <Controller
            control={control}
            name="testIds"
            render={({ field }) => (
              <FormField
                id="pkg-tests"
                label="Tetkikler"
                required
                error={errors.testIds?.message}
                hint={`${field.value.length} tetkik · liste toplamı ${formatPrice(itemsNet)} (KDV dahil ${formatPrice(itemsGross)})`}
              >
                <div className="rounded-lg border border-border">
                  <div className="relative border-b border-border">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      aria-label="Tetkik ara"
                      placeholder="Kod veya ad ile filtrele"
                      className="rounded-b-none border-0 pl-9 focus-visible:ring-0"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  </div>
                  <div className="scrollbar-subtle max-h-[38vh] overflow-y-auto">
                    {catalogue.isPending ? (
                      <p className="p-4 text-sm text-muted-foreground">Katalog yükleniyor…</p>
                    ) : null}
                    {!catalogue.isPending && visible.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">Eşleşen aktif tetkik yok.</p>
                    ) : null}
                    {TEST_CATEGORIES.map((category) => {
                      const group = visible.filter((t) => t.category === category);
                      if (group.length === 0) return null;
                      return (
                        <fieldset
                          key={category}
                          className="border-b border-border px-4 py-3 last:border-b-0"
                        >
                          <legend className="sr-only">{TEST_CATEGORY_LABELS[category]}</legend>
                          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {TEST_CATEGORY_LABELS[category]}
                          </p>
                          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            {group.map((test) => (
                              <div key={test.id} className="flex items-start gap-2.5">
                                <Checkbox
                                  id={`pkg-test-${test.id}`}
                                  className="mt-0.5"
                                  checked={field.value.includes(test.id)}
                                  onCheckedChange={(v) =>
                                    field.onChange(
                                      v === true
                                        ? [...field.value, test.id]
                                        : field.value.filter((id) => id !== test.id),
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`pkg-test-${test.id}`}
                                  className="flex cursor-pointer flex-wrap items-baseline gap-x-2 text-sm font-normal leading-5"
                                >
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {test.code}
                                  </span>
                                  {test.name}
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    {formatPrice(test.unitPrice)}
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>
                </div>
              </FormField>
            )}
          />

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
              {pkg ? 'Kaydet' : 'Paketi Kaydet'}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
