import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { FormField } from '@/design-system/form-field';
import { toApiError } from '@/services/api-client';
import type { Branch, Company, Workplace } from '@/types/company';
import { HAZARD_CLASS, HAZARD_CLASSES } from './company-labels';
import {
  type BranchFormValues,
  branchSchema,
  type CompanyFormValues,
  companySchema,
  emptyBranchForm,
  emptyCompanyForm,
  emptyWorkplaceForm,
  type WorkplaceFormValues,
  workplaceSchema,
} from './company-schemas';

interface DialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  error: unknown;
  submitting: boolean;
  submitLabel: string;
  onSubmit: () => void;
  children: React.ReactNode;
}

function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  error,
  submitting,
  submitLabel,
  onSubmit,
  children,
}: DialogShellProps) {
  const apiError = error ? toApiError(error) : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
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
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
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
              {submitLabel}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HazardSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {HAZARD_CLASSES.map((hazard) => (
          <SelectItem key={hazard} value={hazard}>
            {HAZARD_CLASS[hazard].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ company */

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: CompanyFormValues) => void;
}

function toCompanyForm(company: Company): CompanyFormValues {
  return {
    name: company.name,
    taxNumber: company.taxNumber ?? '',
    sgkRegistrationNumber: company.sgkRegistrationNumber ?? '',
    hazardClass: company.hazardClass,
    address: company.address ?? '',
    phone: company.phone ?? '',
    email: company.email ?? '',
  };
}

export function CompanyDialog({
  open,
  onOpenChange,
  company = null,
  submitting,
  error,
  onSubmit,
}: CompanyDialogProps) {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: company ? toCompanyForm(company) : emptyCompanyForm,
    mode: 'onBlur',
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;
  // Reset to the record being edited each time the dialog opens.
  useEffect(() => {
    if (open) reset(company ? toCompanyForm(company) : emptyCompanyForm);
  }, [open, company, reset]);

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={company ? 'Firmayı Düzenle' : 'Yeni Firma'}
      description="Hastaların bağlı olduğu işveren. Şube ve işyerleri firma kartından eklenir."
      error={error}
      submitting={submitting}
      submitLabel={company ? 'Kaydet' : 'Firmayı Kaydet'}
      onSubmit={() => void handleSubmit(onSubmit)()}
    >
      <FormField
        id="company-name"
        label="Firma Adı"
        required
        error={errors.name?.message}
        className="sm:col-span-2"
      >
        <Input
          id="company-name"
          autoFocus
          aria-invalid={errors.name ? true : undefined}
          {...register('name')}
        />
      </FormField>
      <FormField
        id="company-taxNumber"
        label="Vergi No"
        error={errors.taxNumber?.message}
        hint="10 hane (şahıs firması için TC)"
      >
        <Input
          id="company-taxNumber"
          inputMode="numeric"
          maxLength={11}
          aria-invalid={errors.taxNumber ? true : undefined}
          {...register('taxNumber')}
        />
      </FormField>
      <FormField
        id="company-sgk"
        label="SGK Sicil No"
        error={errors.sgkRegistrationNumber?.message}
      >
        <Input id="company-sgk" {...register('sgkRegistrationNumber')} />
      </FormField>
      <Controller
        control={control}
        name="hazardClass"
        render={({ field }) => (
          <FormField id="company-hazard" label="Tehlike Sınıfı" required>
            <HazardSelect id="company-hazard" value={field.value} onChange={field.onChange} />
          </FormField>
        )}
      />
      <FormField id="company-phone" label="Telefon" error={errors.phone?.message}>
        <Input id="company-phone" inputMode="tel" {...register('phone')} />
      </FormField>
      <FormField id="company-email" label="e-Posta" error={errors.email?.message}>
        <Input
          id="company-email"
          type="email"
          aria-invalid={errors.email ? true : undefined}
          {...register('email')}
        />
      </FormField>
      <FormField
        id="company-address"
        label="Adres"
        error={errors.address?.message}
        className="sm:col-span-2"
      >
        <Textarea id="company-address" rows={2} {...register('address')} />
      </FormField>
    </DialogShell>
  );
}

/* ------------------------------------------------------------------- branch */

interface BranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: BranchFormValues) => void;
}

export function BranchDialog({
  open,
  onOpenChange,
  branch = null,
  submitting,
  error,
  onSubmit,
}: BranchDialogProps) {
  const toForm = (b: Branch | null): BranchFormValues =>
    b ? { name: b.name, address: b.address ?? '', phone: b.phone ?? '' } : emptyBranchForm;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: toForm(branch),
    mode: 'onBlur',
  });
  useEffect(() => {
    if (open) reset(toForm(branch));
  }, [open, branch, reset]);

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={branch ? 'Şubeyi Düzenle' : 'Yeni Şube'}
      error={error}
      submitting={submitting}
      submitLabel={branch ? 'Kaydet' : 'Şubeyi Kaydet'}
      onSubmit={() => void handleSubmit(onSubmit)()}
    >
      <FormField
        id="branch-name"
        label="Şube Adı"
        required
        error={errors.name?.message}
        className="sm:col-span-2"
      >
        <Input
          id="branch-name"
          autoFocus
          aria-invalid={errors.name ? true : undefined}
          {...register('name')}
        />
      </FormField>
      <FormField id="branch-phone" label="Telefon" error={errors.phone?.message}>
        <Input id="branch-phone" inputMode="tel" {...register('phone')} />
      </FormField>
      <FormField
        id="branch-address"
        label="Adres"
        error={errors.address?.message}
        className="sm:col-span-2"
      >
        <Textarea id="branch-address" rows={2} {...register('address')} />
      </FormField>
    </DialogShell>
  );
}

/* ---------------------------------------------------------------- workplace */

const NO_BRANCH = '__none__';

interface WorkplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workplace?: Workplace | null;
  branches: Branch[];
  submitting: boolean;
  error: unknown;
  onSubmit: (values: WorkplaceFormValues) => void;
}

export function WorkplaceDialog({
  open,
  onOpenChange,
  workplace = null,
  branches,
  submitting,
  error,
  onSubmit,
}: WorkplaceDialogProps) {
  const toForm = (w: Workplace | null): WorkplaceFormValues =>
    w
      ? {
          name: w.name,
          branchId: w.branchId ?? '',
          sgkRegistrationNumber: w.sgkRegistrationNumber ?? '',
          hazardClass: w.hazardClass,
          naceCode: w.naceCode ?? '',
          address: w.address ?? '',
          employeeCount: w.employeeCount === null ? '' : String(w.employeeCount),
        }
      : emptyWorkplaceForm;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkplaceFormValues>({
    resolver: zodResolver(workplaceSchema),
    defaultValues: toForm(workplace),
    mode: 'onBlur',
  });
  useEffect(() => {
    if (open) reset(toForm(workplace));
  }, [open, workplace, reset]);

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={workplace ? 'İşyerini Düzenle' : 'Yeni İşyeri'}
      description="SGK işyeri sicili olan fiziksel çalışma yeri; tehlike sınıfı periyodik muayene sıklığını belirler."
      error={error}
      submitting={submitting}
      submitLabel={workplace ? 'Kaydet' : 'İşyerini Kaydet'}
      onSubmit={() => void handleSubmit(onSubmit)()}
    >
      <FormField
        id="wp-name"
        label="İşyeri Adı"
        required
        error={errors.name?.message}
        className="sm:col-span-2"
      >
        <Input
          id="wp-name"
          autoFocus
          aria-invalid={errors.name ? true : undefined}
          {...register('name')}
        />
      </FormField>
      <Controller
        control={control}
        name="branchId"
        render={({ field }) => (
          <FormField id="wp-branch" label="Şube">
            <Select
              value={field.value || NO_BRANCH}
              onValueChange={(value) => field.onChange(value === NO_BRANCH ? '' : value)}
            >
              <SelectTrigger id="wp-branch">
                <SelectValue placeholder="Şube seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_BRANCH}>— Şube yok —</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      />
      <Controller
        control={control}
        name="hazardClass"
        render={({ field }) => (
          <FormField id="wp-hazard" label="Tehlike Sınıfı" required>
            <HazardSelect id="wp-hazard" value={field.value} onChange={field.onChange} />
          </FormField>
        )}
      />
      <FormField
        id="wp-sgk"
        label="SGK İşyeri Sicil No"
        error={errors.sgkRegistrationNumber?.message}
      >
        <Input id="wp-sgk" {...register('sgkRegistrationNumber')} />
      </FormField>
      <FormField id="wp-nace" label="NACE Kodu" error={errors.naceCode?.message}>
        <Input id="wp-nace" placeholder="25.11.01" {...register('naceCode')} />
      </FormField>
      <FormField id="wp-count" label="Çalışan Sayısı" error={errors.employeeCount?.message}>
        <Input
          id="wp-count"
          inputMode="numeric"
          aria-invalid={errors.employeeCount ? true : undefined}
          {...register('employeeCount')}
        />
      </FormField>
      <FormField
        id="wp-address"
        label="Adres"
        error={errors.address?.message}
        className="sm:col-span-2"
      >
        <Textarea id="wp-address" rows={2} {...register('address')} />
      </FormField>
    </DialogShell>
  );
}
