import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompany, useCompanyPage } from '@/features/companies/use-companies';
import { AppButton } from '@/design-system/app-button';
import { FormField } from '@/design-system/form-field';
import { toApiError } from '@/services/api-client';
import type { Role, StaffUser } from '@/types/user';
import { roleLabel, USER_STATUS } from './user-labels';
import {
  type NewUserFormValues,
  newUserSchema,
  type SetPasswordFormValues,
  setPasswordSchema,
  type UserFormValues,
  userSchema,
} from './user-schemas';

interface ShellProps {
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
}: ShellProps) {
  const apiError = error ? toApiError(error) : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[560px] gap-5 overflow-y-auto" showCloseButton>
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
          {children}
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

function RoleChecklist({
  roles,
  value,
  onChange,
  idPrefix,
}: {
  roles: Role[];
  value: string[];
  onChange: (ids: string[]) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-x-6 gap-y-3 rounded-md border border-border p-4 sm:grid-cols-2">
      {roles.map((role) => (
        <div key={role.id} className="flex items-start gap-2.5">
          <Checkbox
            id={`${idPrefix}-${role.id}`}
            className="mt-0.5"
            checked={value.includes(role.id)}
            onCheckedChange={(checked) =>
              onChange(
                checked === true ? [...value, role.id] : value.filter((id) => id !== role.id),
              )
            }
          />
          <Label
            htmlFor={`${idPrefix}-${role.id}`}
            className="cursor-pointer text-sm font-normal leading-tight"
          >
            {roleLabel(role.name)}
            {role.description ? (
              <span className="block text-xs text-muted-foreground">{role.description}</span>
            ) : null}
          </Label>
        </div>
      ))}
    </div>
  );
}

function CompanyScopeField({
  value,
  onChange,
  id,
  disabled,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
  id: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const companies = useCompanyPage({ pageSize: 50, search: search || undefined });
  const selected = useCompany(value ?? undefined);
  const options = new Map(
    (companies.data?.items ?? []).map((company) => [company.id, company.name]),
  );
  if (selected.data) options.set(selected.data.id, selected.data.name);
  return (
    <FormField
      id={id}
      label="Firma erişim kapsamı"
      className="sm:col-span-2"
      hint="Firma temsilcisine bir firma atayın. Atanmamış temsilci veri göremez. Firma atanan hesap ek rolleri olsa da yalnızca bu firmanın izin verilen kayıtlarını okuyabilir."
    >
      <Input
        aria-label="Erişim verilecek firmayı ara"
        placeholder="Firma adına göre ara…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={disabled}
      />
      <Select
        value={value ?? '__none'}
        onValueChange={(next) => onChange(next === '__none' ? null : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Firma seçin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">Firma atanmamış</SelectItem>
          {[...options].map(([key, name]) => (
            <SelectItem key={key} value={key}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {companies.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Firma listesi yüklenemedi.
        </p>
      ) : null}
    </FormField>
  );
}

/* ------------------------------------------------------------ new user */

interface NewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  submitting: boolean;
  error: unknown;
  onSubmit: (values: NewUserFormValues) => void;
}

const emptyNewUser: NewUserFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roleIds: [],
  companyId: null,
};

export function NewUserDialog({
  open,
  onOpenChange,
  roles,
  submitting,
  error,
  onSubmit,
}: NewUserDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: emptyNewUser,
    mode: 'onBlur',
  });
  useEffect(() => {
    if (open) reset(emptyNewUser);
  }, [open, reset]);
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni Personel"
      description="Kullanıcı geçici şifreyle giriş yapar; ilk girişte değiştirmesi önerilir."
      error={error}
      submitting={submitting}
      submitLabel="Personeli Kaydet"
      onSubmit={() => void handleSubmit(onSubmit)()}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="user-firstName" label="Adı" required error={errors.firstName?.message}>
          <Input
            id="user-firstName"
            autoFocus
            autoComplete="off"
            aria-invalid={errors.firstName ? true : undefined}
            {...register('firstName')}
          />
        </FormField>
        <FormField id="user-lastName" label="Soyadı" required error={errors.lastName?.message}>
          <Input
            id="user-lastName"
            autoComplete="off"
            aria-invalid={errors.lastName ? true : undefined}
            {...register('lastName')}
          />
        </FormField>
        <FormField id="user-email" label="e-Posta" required error={errors.email?.message}>
          <Input
            id="user-email"
            type="email"
            autoComplete="off"
            aria-invalid={errors.email ? true : undefined}
            {...register('email')}
          />
        </FormField>
        <FormField
          id="user-password"
          label="Geçici Şifre"
          required
          error={errors.password?.message}
          hint="En az 10 karakter, harf ve rakam"
        >
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            {...register('password')}
          />
        </FormField>
        <Controller
          control={control}
          name="companyId"
          render={({ field }) => (
            <CompanyScopeField
              id="new-user-company"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="roleIds"
          render={({ field }) => (
            <FormField
              id="user-roles"
              label="Roller"
              className="sm:col-span-2"
              hint="Kullanıcının yetkileri seçili rollerin birleşimidir."
            >
              <RoleChecklist
                idPrefix="new-role"
                roles={roles}
                value={field.value}
                onChange={field.onChange}
              />
            </FormField>
          )}
        />
      </div>
    </DialogShell>
  );
}

/* ----------------------------------------------------------- edit user */

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: StaffUser | null;
  isSelf: boolean;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: UserFormValues) => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  isSelf,
  submitting,
  error,
  onSubmit,
}: EditUserDialogProps) {
  const toForm = (u: StaffUser | null): UserFormValues =>
    u
      ? {
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          status: u.status,
          companyId: u.companyId ?? null,
        }
      : { firstName: '', lastName: '', email: '', status: 'ACTIVE', companyId: null };
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: toForm(user),
    mode: 'onBlur',
  });
  useEffect(() => {
    if (open) reset(toForm(user));
  }, [open, user, reset]);
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Personeli Düzenle"
      error={error}
      submitting={submitting}
      submitLabel="Kaydet"
      onSubmit={() => void handleSubmit(onSubmit)()}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="edit-firstName" label="Adı" required error={errors.firstName?.message}>
          <Input
            id="edit-firstName"
            aria-invalid={errors.firstName ? true : undefined}
            {...register('firstName')}
          />
        </FormField>
        <FormField id="edit-lastName" label="Soyadı" required error={errors.lastName?.message}>
          <Input
            id="edit-lastName"
            aria-invalid={errors.lastName ? true : undefined}
            {...register('lastName')}
          />
        </FormField>
        <FormField id="edit-email" label="e-Posta" required error={errors.email?.message}>
          <Input
            id="edit-email"
            type="email"
            aria-invalid={errors.email ? true : undefined}
            {...register('email')}
          />
        </FormField>
        <Controller
          control={control}
          name="companyId"
          render={({ field }) => (
            <CompanyScopeField
              id="edit-user-company"
              value={field.value}
              onChange={field.onChange}
              disabled={isSelf}
            />
          )}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <FormField
              id="edit-status"
              label="Durum"
              hint={
                isSelf
                  ? 'Kendi hesabınızı pasife alamazsınız.'
                  : 'Pasif/askıdaki kullanıcı giriş yapamaz; oturumları kapatılır.'
              }
            >
              <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(USER_STATUS) as Array<keyof typeof USER_STATUS>).map((status) => (
                    <SelectItem key={status} value={status}>
                      {USER_STATUS[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        />
      </div>
    </DialogShell>
  );
}

/* ---------------------------------------------------------- user roles */

interface UserRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: StaffUser | null;
  roles: Role[];
  submitting: boolean;
  error: unknown;
  onSubmit: (roleIds: string[]) => void;
}

export function UserRolesDialog({
  open,
  onOpenChange,
  user,
  roles,
  submitting,
  error,
  onSubmit,
}: UserRolesDialogProps) {
  const [selected, setSelected] = useState<string[]>(
    () => user?.userRoles.map((ur) => ur.role.id) ?? [],
  );
  // Seed the checklist when the dialog (re)opens — a render-time state adjustment, not an effect.
  const [seed, setSeed] = useState<{ open: boolean; user: StaffUser | null }>({ open, user });
  if (seed.open !== open || seed.user !== user) {
    setSeed({ open, user });
    if (open) setSelected(user?.userRoles.map((ur) => ur.role.id) ?? []);
  }
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={user ? `Roller · ${user.firstName} ${user.lastName}` : 'Roller'}
      description="Yetkiler seçili rollerin birleşimidir; değişiklik bir sonraki istekte geçerli olur."
      error={error}
      submitting={submitting}
      submitLabel="Rolleri Kaydet"
      onSubmit={() => onSubmit(selected)}
    >
      <RoleChecklist idPrefix="assign-role" roles={roles} value={selected} onChange={setSelected} />
    </DialogShell>
  );
}

/* -------------------------------------------------------- set password */

interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: StaffUser | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: SetPasswordFormValues) => void;
}

export function SetPasswordDialog({
  open,
  onOpenChange,
  user,
  submitting,
  error,
  onSubmit,
}: SetPasswordDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirm: '' },
    mode: 'onBlur',
  });
  useEffect(() => {
    if (open) reset({ password: '', confirm: '' });
  }, [open, reset]);
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={user ? `Şifre Sıfırla · ${user.firstName} ${user.lastName}` : 'Şifre Sıfırla'}
      description="Yeni şifre kaydedilince kullanıcının tüm oturumları kapatılır."
      error={error}
      submitting={submitting}
      submitLabel="Şifreyi Kaydet"
      onSubmit={() => void handleSubmit(onSubmit)()}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="pw-new"
          label="Yeni Şifre"
          required
          error={errors.password?.message}
          hint="En az 10 karakter, harf ve rakam"
        >
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={errors.password ? true : undefined}
            {...register('password')}
          />
        </FormField>
        <FormField
          id="pw-confirm"
          label="Yeni Şifre (tekrar)"
          required
          error={errors.confirm?.message}
        >
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.confirm ? true : undefined}
            {...register('confirm')}
          />
        </FormField>
      </div>
    </DialogShell>
  );
}
