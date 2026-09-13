import { RecoveryLinkDialog } from '@/features/users/recovery-link-dialog';
import { KeyRound, Pencil, Plus, Search, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS } from '@osgb/shared-types';
import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { StatusBadge } from '@/design-system/status-badge';
import { toast } from '@/design-system/toast';
import { formatDateTime } from '@/features/patients/patient-utils';
import { RoleDialog } from '@/features/users/role-dialog';
import {
  EditUserDialog,
  NewUserDialog,
  SetPasswordDialog,
  UserRolesDialog,
} from '@/features/users/user-dialogs';
import { roleLabel, USER_STATUS } from '@/features/users/user-labels';
import { useRoleMutations, useRoles, useUserMutations, useUsers } from '@/features/users/use-users';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import { toApiError } from '@/services/api-client';
import { useAuthStore } from '@/stores/auth.store';
import type { Role, StaffUser } from '@/types/user';

type UserAction =
  { kind: 'new' } | { kind: 'edit' | 'roles' | 'password' | 'recovery'; user: StaffUser } | null;
type RoleAction = { kind: 'new' } | { kind: 'edit' | 'remove'; role: Role } | null;

const fail = (title: string) => (error: unknown) => toast.error(title, toApiError(error).message);

function UsersTab() {
  const me = useAuthStore((s) => s.user);
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<UserAction>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const users = useUsers({
    page,
    pageSize: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const roles = useRoles(can(PERMISSIONS.ROLES_READ));
  const mutations = useUserMutations();
  const close = () => {
    setAction(null);
    mutations.create.reset();
    mutations.update.reset();
    mutations.assignRoles.reset();
    mutations.setPassword.reset();
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Personel ara"
            placeholder="Ad, soyad veya e-posta"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Can permission={PERMISSIONS.USERS_CREATE}>
          <AppButton className="ml-auto" onClick={() => setAction({ kind: 'new' })}>
            <Plus />
            Yeni Personel
          </AppButton>
        </Can>
      </div>

      {users.isPending ? (
        <LoadingState title="Personel yükleniyor…" className="min-h-48 rounded-none border-0" />
      ) : null}
      {users.error ? (
        <ErrorState onRetry={() => void users.refetch()} className="rounded-none border-0" />
      ) : null}
      {users.data ? (
        users.data.items.length === 0 ? (
          <EmptyState
            title={debouncedSearch ? 'Personel bulunamadı' : 'Henüz personel yok'}
            className="rounded-none border-0"
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>e-Posta</TableHead>
                  <TableHead>Roller</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Son giriş</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">
                      {user.firstName} {user.lastName}
                      {user.id === me?.id ? (
                        <span className="ml-2 text-xs text-muted-foreground">(siz)</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.userRoles.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : null}
                        {user.userRoles.map(({ role }) => (
                          <Badge key={role.id} variant="outline">
                            {roleLabel(role.name)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={USER_STATUS[user.status].status}
                        label={USER_STATUS[user.status].label}
                      />
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permission={PERMISSIONS.USERS_UPDATE}>
                        <div className="flex justify-end gap-1">
                          <AppButton
                            size="sm"
                            variant="ghost"
                            aria-label={`${user.firstName} ${user.lastName} düzenle`}
                            onClick={() => setAction({ kind: 'edit', user })}
                          >
                            <Pencil />
                          </AppButton>
                          {can(PERMISSIONS.ROLES_READ) ? (
                            <AppButton
                              size="sm"
                              variant="ghost"
                              aria-label={`${user.firstName} ${user.lastName} rolleri`}
                              onClick={() => setAction({ kind: 'roles', user })}
                            >
                              <UserCog />
                            </AppButton>
                          ) : null}
                          <AppButton
                            size="sm"
                            variant="secondary"
                            disabled={user.status !== 'ACTIVE'}
                            aria-label={`${user.firstName} ${user.lastName} kurtarma bağlantısı`}
                            onClick={() => setAction({ kind: 'recovery', user })}
                          >
                            Kurtarma bağlantısı
                          </AppButton>
                          <AppButton
                            size="sm"
                            variant="ghost"
                            aria-label={`${user.firstName} ${user.lastName} şifre sıfırla`}
                            onClick={() => setAction({ kind: 'password', user })}
                          >
                            <KeyRound />
                          </AppButton>
                        </div>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination meta={users.data.meta} onPageChange={setPage} />
          </>
        )
      ) : null}

      {action?.kind === 'recovery' ? (
        <RecoveryLinkDialog key={action.user.id} user={action.user} onClose={close} />
      ) : null}
      <NewUserDialog
        open={action?.kind === 'new'}
        onOpenChange={(open) => !open && close()}
        roles={roles.data ?? []}
        submitting={mutations.create.isPending}
        error={mutations.create.error}
        onSubmit={(values) =>
          mutations.create.mutate(values, {
            onSuccess: (user) => {
              toast.success('Personel oluşturuldu', `${user.firstName} ${user.lastName}`);
              close();
            },
          })
        }
      />
      <EditUserDialog
        open={action?.kind === 'edit'}
        onOpenChange={(open) => !open && close()}
        user={action?.kind === 'edit' ? action.user : null}
        isSelf={action?.kind === 'edit' && action.user.id === me?.id}
        submitting={mutations.update.isPending}
        error={mutations.update.error}
        onSubmit={(values) =>
          action?.kind === 'edit' &&
          mutations.update.mutate(
            { id: action.user.id, input: values },
            {
              onSuccess: () => {
                toast.success('Personel güncellendi');
                close();
              },
            },
          )
        }
      />
      <UserRolesDialog
        open={action?.kind === 'roles'}
        onOpenChange={(open) => !open && close()}
        user={action?.kind === 'roles' ? action.user : null}
        roles={roles.data ?? []}
        submitting={mutations.assignRoles.isPending}
        error={mutations.assignRoles.error}
        onSubmit={(roleIds) =>
          action?.kind === 'roles' &&
          mutations.assignRoles.mutate(
            { id: action.user.id, roleIds },
            {
              onSuccess: () => {
                toast.success('Roller güncellendi');
                close();
              },
            },
          )
        }
      />
      <SetPasswordDialog
        open={action?.kind === 'password'}
        onOpenChange={(open) => !open && close()}
        user={action?.kind === 'password' ? action.user : null}
        submitting={mutations.setPassword.isPending}
        error={mutations.setPassword.error}
        onSubmit={({ password }) =>
          action?.kind === 'password' &&
          mutations.setPassword.mutate(
            { id: action.user.id, password },
            {
              onSuccess: ({ revokedSessions }) => {
                toast.success(
                  'Şifre sıfırlandı',
                  revokedSessions > 0 ? `${revokedSessions} oturum kapatıldı` : undefined,
                );
                close();
              },
            },
          )
        }
      />
    </div>
  );
}

function RolesTab() {
  const roles = useRoles();
  const mutations = useRoleMutations();
  const [action, setAction] = useState<RoleAction>(null);
  const close = () => {
    setAction(null);
    mutations.create.reset();
    mutations.update.reset();
    mutations.setPermissions.reset();
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <p className="text-sm text-muted-foreground">
          Sistem rolleri her kurumda hazır gelir; özel roller eklenebilir.
        </p>
        <Can permission={PERMISSIONS.ROLES_MANAGE}>
          <AppButton onClick={() => setAction({ kind: 'new' })}>
            <Plus />
            Yeni Rol
          </AppButton>
        </Can>
      </div>
      {roles.isPending ? (
        <LoadingState title="Roller yükleniyor…" className="min-h-48 rounded-none border-0" />
      ) : null}
      {roles.error ? (
        <ErrorState onRetry={() => void roles.refetch()} className="rounded-none border-0" />
      ) : null}
      {roles.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rol</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead className="text-right">Yetki</TableHead>
              <TableHead className="text-right">Kullanıcı</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.data.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium text-foreground">
                  <span className="inline-flex items-center gap-2">
                    {roleLabel(role.name)}
                    {role.isSystem ? (
                      <Badge variant="neutral">
                        <ShieldCheck className="size-3" aria-hidden />
                        Sistem
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">{role.name}</span>
                </TableCell>
                <TableCell className="max-w-[360px] truncate">{role.description ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{role.permissions.length}</TableCell>
                <TableCell className="text-right tabular-nums">{role.userCount}</TableCell>
                <TableCell className="text-right">
                  <Can permission={PERMISSIONS.ROLES_MANAGE}>
                    <div className="flex justify-end gap-1">
                      <AppButton
                        size="sm"
                        variant="ghost"
                        aria-label={`${roleLabel(role.name)} düzenle`}
                        onClick={() => setAction({ kind: 'edit', role })}
                      >
                        <Pencil />
                      </AppButton>
                      {!role.isSystem ? (
                        <AppButton
                          size="sm"
                          variant="ghost"
                          aria-label={`${roleLabel(role.name)} sil`}
                          onClick={() => setAction({ kind: 'remove', role })}
                        >
                          <Trash2 />
                        </AppButton>
                      ) : null}
                    </div>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <RoleDialog
        open={action?.kind === 'new' || action?.kind === 'edit'}
        onOpenChange={(open) => !open && close()}
        role={action?.kind === 'edit' ? action.role : null}
        submitting={
          mutations.create.isPending ||
          mutations.update.isPending ||
          mutations.setPermissions.isPending
        }
        error={mutations.create.error ?? mutations.update.error ?? mutations.setPermissions.error}
        onSubmit={async ({ name, description, permissions }) => {
          try {
            if (action?.kind === 'edit') {
              const role = action.role;
              if (
                !role.isSystem &&
                (name !== role.name || description !== (role.description ?? ''))
              ) {
                await mutations.update.mutateAsync({
                  id: role.id,
                  input: { name, description: description || undefined },
                });
              }
              await mutations.setPermissions.mutateAsync({ id: role.id, permissions });
              toast.success('Rol güncellendi');
            } else {
              await mutations.create.mutateAsync({
                name,
                description: description || undefined,
                permissions,
              });
              toast.success('Rol oluşturuldu');
            }
            close();
          } catch {
            // the dialog renders the API error
          }
        }}
      />
      <ConfirmDialog
        open={action?.kind === 'remove'}
        onOpenChange={(open) => !open && setAction(null)}
        title="Rol silinsin mi?"
        description={
          action?.kind === 'remove'
            ? `${roleLabel(action.role.name)} rolü ${action.role.userCount} kullanıcıdan kaldırılır.`
            : undefined
        }
        loading={mutations.remove.isPending}
        onConfirm={() =>
          action?.kind === 'remove' &&
          mutations.remove.mutate(action.role.id, {
            onSuccess: () => {
              toast.success('Rol silindi');
              setAction(null);
            },
            onError: fail('Silinemedi'),
          })
        }
      />
    </div>
  );
}

export function StaffPage() {
  const { can } = usePermissions();
  return (
    <>
      <PageHeader
        title="Personel Tanımları"
        description="Sisteme giriş yapan kullanıcılar ve yetkilerini belirleyen roller."
        breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Personel Tanımları' }]}
      />
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          {can(PERMISSIONS.ROLES_READ) ? (
            <TabsTrigger value="roles">Roller ve Yetkiler</TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        {can(PERMISSIONS.ROLES_READ) ? (
          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}
