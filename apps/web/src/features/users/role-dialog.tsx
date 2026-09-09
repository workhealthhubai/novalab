import { zodResolver } from '@hookform/resolvers/zod';
import type { Permission } from '@osgb/shared-types';
import { ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { AppButton } from '@/design-system/app-button';
import { FormField } from '@/design-system/form-field';
import { cn } from '@/lib/utils';
import { toApiError } from '@/services/api-client';
import type { Role } from '@/types/user';
import { permissionGroups, roleLabel } from './user-labels';
import { type RoleFormValues, roleSchema } from './user-schemas';

export interface RoleDialogResult {
  name: string;
  description: string;
  permissions: Permission[];
}

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  submitting: boolean;
  error: unknown;
  onSubmit: (result: RoleDialogResult) => void;
}

/**
 * Role editor: name/description plus the permission matrix grouped by module. System roles keep
 * their name; only permissions can change. Medical permissions are flagged.
 */
export function RoleDialog({
  open,
  onOpenChange,
  role,
  submitting,
  error,
  onSubmit,
}: RoleDialogProps) {
  const groups = useMemo(() => permissionGroups(), []);
  const [permissions, setPermissions] = useState<Permission[]>(() => role?.permissions ?? []);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '' },
    mode: 'onBlur',
  });
  // Seed the matrix when the dialog (re)opens — a render-time state adjustment, not an effect.
  const [seed, setSeed] = useState<{ open: boolean; role: Role | null }>({ open, role });
  if (seed.open !== open || seed.role !== role) {
    setSeed({ open, role });
    if (open) setPermissions(role?.permissions ?? []);
  }
  useEffect(() => {
    if (open) reset({ name: role?.name ?? '', description: role?.description ?? '' });
  }, [open, role, reset]);

  const apiError = error ? toApiError(error) : null;
  const toggle = (key: Permission, checked: boolean) =>
    setPermissions((current) =>
      checked ? [...new Set([...current, key])] : current.filter((p) => p !== key),
    );
  const toggleGroup = (keys: Permission[], checked: boolean) =>
    setPermissions((current) =>
      checked ? [...new Set([...current, ...keys])] : current.filter((p) => !keys.includes(p)),
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[880px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>{role ? `Rolü Düzenle · ${roleLabel(role.name)}` : 'Yeni Rol'}</DialogTitle>
          <DialogDescription>
            {role?.isSystem
              ? 'Sistem rolü: adı değiştirilemez ve silinemez; yetkileri düzenlenebilir.'
              : 'Rol adı API anahtarıdır (küçük harf, alt çizgi); yetkileri modül modül işaretleyin.'}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit((values) => onSubmit({ ...values, permissions }))();
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="role-name" label="Rol adı" required error={errors.name?.message}>
              <Input
                id="role-name"
                placeholder="ik_uzmani"
                disabled={role?.isSystem}
                aria-invalid={errors.name ? true : undefined}
                {...register('name')}
              />
            </FormField>
            <FormField id="role-description" label="Açıklama" error={errors.description?.message}>
              <Input id="role-description" {...register('description')} />
            </FormField>
          </div>
          <div className="scrollbar-subtle max-h-[56vh] overflow-y-auto rounded-lg border border-border">
            {groups.map((group, index) => {
              const keys = group.permissions.map((p) => p.key);
              const selectedCount = keys.filter((k) => permissions.includes(k)).length;
              const all = selectedCount === keys.length;
              const some = !all && selectedCount > 0;
              return (
                <fieldset
                  key={group.category}
                  className={cn(
                    'grid gap-x-6 gap-y-3 px-4 py-3 sm:grid-cols-[200px_1fr]',
                    index > 0 && 'border-t border-border',
                    index % 2 === 1 && 'bg-muted/40',
                  )}
                >
                  <legend className="sr-only">{group.label}</legend>
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id={`group-${group.category}`}
                      className="mt-0.5"
                      checked={all ? true : some ? 'indeterminate' : false}
                      onCheckedChange={(checked) => toggleGroup(keys, checked === true)}
                    />
                    <Label
                      htmlFor={`group-${group.category}`}
                      className="cursor-pointer text-sm font-semibold leading-5"
                    >
                      {group.label}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {selectedCount} / {keys.length} yetki
                      </span>
                    </Label>
                  </div>
                  <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                    {group.permissions.map((permission) => (
                      <div key={permission.key} className="flex items-start gap-2.5">
                        <Checkbox
                          id={`perm-${permission.key}`}
                          className="mt-0.5"
                          checked={permissions.includes(permission.key)}
                          onCheckedChange={(checked) => toggle(permission.key, checked === true)}
                        />
                        <Label
                          htmlFor={`perm-${permission.key}`}
                          className="cursor-pointer text-sm font-normal leading-5"
                        >
                          {permission.label}
                          {permission.medical ? (
                            <ShieldAlert
                              className="ml-1.5 inline size-3.5 align-text-bottom text-warning"
                              aria-label="Tıbbi veri"
                            />
                          ) : null}
                        </Label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              {permissions.length} yetki seçili
              <span className="inline-flex items-center gap-1">
                <ShieldAlert className="size-3.5 text-warning" aria-hidden /> tıbbi veri erişimi
              </span>
            </span>
            <div className="flex gap-2">
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Vazgeç
              </AppButton>
              <AppButton type="submit" loading={submitting}>
                {role ? 'Kaydet' : 'Rolü Oluştur'}
              </AppButton>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
