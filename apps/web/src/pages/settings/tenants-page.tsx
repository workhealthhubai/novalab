import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Users,
  Briefcase,
  ArrowLeftRight,
} from 'lucide-react';
import { TenantStatus } from '@osgb/shared-types';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { Pagination } from '@/design-system/pagination';
import { toast } from '@/design-system/toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/features/patients/patient-utils';
import { toApiError } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import {
  type CreateTenantPayload,
  type TenantItem,
  type UpdateTenantPayload,
  tenantsService,
} from '@/services/tenants.service';

const breadcrumbs = [{ label: 'Genel Ayarlar' }, { label: 'OSGB Kiracıları' }];

function slugify(text: string): string {
  const trMap: Record<string, string> = {
    ç: 'c', Ç: 'c',
    ğ: 'g', Ğ: 'g',
    ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o',
    ş: 's', Ş: 's',
    ü: 'u', Ü: 'u',
  };
  return text
    .split('')
    .map((char) => trMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function TenantsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<TenantItem | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState<CreateTenantPayload>({
    name: '',
    slug: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateTenantPayload>({
    name: '',
    slug: '',
    status: TenantStatus.ACTIVE,
  });

  // Query tenants list
  const {
    data: tenantsData,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tenants', 'list', page],
    queryFn: () => tenantsService.list(page, 20),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateTenantPayload) => tenantsService.create(payload),
    onSuccess: (newTenant) => {
      toast.success(`"${newTenant.name}" OSGB başarıyla oluşturuldu`);
      setCreateOpen(false);
      setCreateForm({
        name: '',
        slug: '',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: '',
      });
      setSlugManuallyEdited(false);
      void queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (err) => {
      toast.error(toApiError(err).message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTenantPayload }) =>
      tenantsService.update(id, payload),
    onSuccess: (updated) => {
      toast.success(`"${updated.name}" güncellendi`);
      setEditingTenant(null);
      void queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (err) => {
      toast.error(toApiError(err).message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantsService.remove(id),
    onSuccess: () => {
      toast.success('OSGB başarıyla silindi');
      setDeletingTenant(null);
      void queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (err) => {
      toast.error(toApiError(err).message);
    },
  });

  const handleNameChange = (name: string) => {
    setCreateForm((prev) => ({
      ...prev,
      name,
      slug: slugManuallyEdited ? prev.slug : slugify(name),
    }));
  };

  const handleStartEdit = (t: TenantItem) => {
    setEditingTenant(t);
    setEditForm({
      name: t.name,
      slug: t.slug,
      status: t.status,
    });
  };

  const handleSwitchToTenant = async (t: TenantItem) => {
    try {
      const resp = await authService.switchTenant(t.id);
      const remember = useAuthStore.getState().remember;
      useAuthStore.getState().setSession(resp, resp.user, remember);
      queryClient.clear();
      toast.success(
        resp.user.activeTenantName
          ? `"${resp.user.activeTenantName}" kurumuna geçildi`
          : 'Ana kurumunuza dönüldü',
      );
      void queryClient.invalidateQueries();
    } catch (err) {
      toast.error(
        'Kurum geçişi yapılamadı: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'),
      );
    }
  };

  const items = tenantsData?.items ?? [];
  const filteredItems = items.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const totalCount = tenantsData?.meta?.total ?? items.length;
  const activeCount = items.filter((t) => t.status === TenantStatus.ACTIVE).length;
  const suspendedCount = items.filter((t) => t.status === TenantStatus.SUSPENDED).length;


  return (
    <>
      <PageHeader
        title="OSGB Kiracıları (Multi-Tenant)"
        description="Sistemde tanımlı bağımsız OSGB kiracılarını açın, yapılandırın, durumlarını değiştirin veya silin."
        breadcrumbs={breadcrumbs}
        actions={
          <AppButton
            variant="primary"
            onClick={() => {
              setCreateForm({
                name: '',
                slug: '',
                adminFirstName: '',
                adminLastName: '',
                adminEmail: '',
                adminPassword: '',
              });
              setSlugManuallyEdited(false);
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" />
            Yeni OSGB Aç
          </AppButton>
        }
      />


      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary-dark">
            <Building2 className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Toplam Kayıtlı OSGB</p>
            <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Aktif OSGB</p>
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Askıya Alınan OSGB</p>
            <p className="text-2xl font-bold text-foreground">{suspendedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Input
            placeholder="OSGB adı veya slug ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table & States */}
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          title="OSGB kiracıları yüklenemedi"
          description={error ? toApiError(error).message : undefined}
          onRetry={() => void refetch()}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="OSGB bulunamadı"
          description={
            search
              ? 'Arama kriterlerinize uygun OSGB kaydı bulunamadı.'
              : 'Sistemde henüz kayıtlı başka bir OSGB kiracısı bulunmuyor.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OSGB Adı & Kod</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Personel / Kullanıcı</TableHead>
                  <TableHead>Hizmet Şirketleri</TableHead>
                  <TableHead>Açılış Tarihi</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((t) => {
                  const isCurrent = t.id === user?.tenantId;
                  return (
                    <TableRow key={t.id} className={isCurrent ? 'bg-primary-soft/20' : undefined}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{t.name}</span>
                            {isCurrent && (
                              <Badge variant="default" className="text-[10px] py-0 px-1.5">
                                Aktif Oturumunuz
                              </Badge>
                            )}
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">/{t.slug}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {t.status === TenantStatus.ACTIVE ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive-soft text-destructive">
                            Askıya Alındı
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <Users className="size-4 text-muted-foreground" />
                          <span>{t._count?.users ?? 0}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <Briefcase className="size-4 text-muted-foreground" />
                          <span>{t._count?.companies ?? 0}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(t.createdAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCurrent ? (
                            <AppButton
                              variant="secondary"
                              size="sm"
                              className="text-primary hover:bg-primary-soft"
                              onClick={() => void handleSwitchToTenant(t)}
                              title="Bu kurumun paneline ve verilerine geçiş yapın"
                            >
                              <ArrowLeftRight className="mr-1 size-3.5" />
                              Geçiş Yap
                            </AppButton>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft/80 px-2.5 py-1 text-xs font-semibold text-primary">
                              <CheckCircle2 className="size-3.5" />
                              Aktif
                            </span>
                          )}

                          <AppButton
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStartEdit(t)}
                            title="Düzenle"
                          >
                            <Pencil className="mr-1 size-3.5" />
                            Düzenle
                          </AppButton>

                          <AppButton
                            variant="secondary"
                            size="sm"
                            className="text-destructive hover:bg-destructive-soft hover:text-destructive disabled:opacity-40"
                            disabled={isCurrent}
                            onClick={() => setDeletingTenant(t)}
                            title={isCurrent ? 'Aktif oturum açtığınız OSGB silinemez' : 'OSGB Sil'}
                          >
                            <Trash2 className="size-3.5" />
                          </AppButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {tenantsData?.meta && (
            <Pagination meta={tenantsData.meta} onPageChange={setPage} />
          )}

        </div>
      )}

      {/* CREATE TENANT MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[560px] gap-5" showCloseButton>
          <DialogHeader>
            <DialogTitle>Yeni Bağımsız OSGB Aç</DialogTitle>
            <DialogDescription>
              Sisteme yeni bir bağımsız OSGB (kiracı) ekleyin. Otomatik olarak standart roller oluşturulacak ve isteğe bağlı ilk yönetici tanımlanacaktır.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!createForm.name.trim() || !createForm.slug.trim()) {
                toast.error('Lütfen OSGB adı ve slug alanlarını doldurun.');
                return;
              }
              const payload: CreateTenantPayload = {
                name: createForm.name.trim(),
                slug: createForm.slug.trim(),
              };
              if (createForm.adminEmail?.trim() && createForm.adminPassword?.trim()) {
                payload.adminEmail = createForm.adminEmail.trim();
                payload.adminPassword = createForm.adminPassword.trim();
                payload.adminFirstName = createForm.adminFirstName?.trim() || undefined;
                payload.adminLastName = createForm.adminLastName?.trim() || undefined;
              }
              createMutation.mutate(payload);
            }}
            className="space-y-4"
          >

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tenant-name">
                  OSGB Adı <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tenant-name"
                  placeholder="Örn: Kuzey Ege Ortak Sağlık Güvenlik Birimi"
                  value={createForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tenant-slug">
                  Tanımlayıcı Kod / URL Slug <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tenant-slug"
                  placeholder="kuzey-ege-osgb"
                  value={createForm.slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setCreateForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
                  }}
                  required
                />

                <p className="text-xs text-muted-foreground">
                  Girişlerde ve URL tanımlayıcılarında kullanılır (küçük harfler, sayılar ve tire).
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3.5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                İlk Yönetici Hesabı (Opsiyonel)
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="admin-first-name" className="text-xs">
                    Yönetici Adı
                  </Label>
                  <Input
                    id="admin-first-name"
                    placeholder="Ahmet"
                    value={createForm.adminFirstName || ''}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, adminFirstName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-last-name" className="text-xs">
                    Yönetici Soyadı
                  </Label>
                  <Input
                    id="admin-last-name"
                    placeholder="Kaya"
                    value={createForm.adminLastName || ''}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, adminLastName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="admin-email" className="text-xs">
                    E-Posta Adresi
                  </Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@kuzeyege.com"
                    value={createForm.adminEmail || ''}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, adminEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="admin-password" className="text-xs">
                    Başlangıç Şifresi
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="En az 6 karakter"
                    value={createForm.adminPassword || ''}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, adminPassword: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Vazgeç
              </AppButton>
              <AppButton type="submit" variant="primary" loading={createMutation.isPending}>
                OSGB Oluştur
              </AppButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT TENANT MODAL */}
      <Dialog
        open={Boolean(editingTenant)}
        onOpenChange={(open) => !open && setEditingTenant(null)}
      >
        <DialogContent className="max-w-[500px] gap-5" showCloseButton>
          <DialogHeader>
            <DialogTitle>OSGB Düzenle</DialogTitle>
            <DialogDescription>
              {editingTenant?.name} kiracısının temel ayarlarını ve durumunu güncelleyin.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingTenant) return;
              updateMutation.mutate({
                id: editingTenant.id,
                payload: editForm,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">
                OSGB Adı <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-slug">
                Slug / Tanımlayıcı Kod <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-slug"
                value={editForm.slug || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-status">
                Hesap Durumu <span className="text-destructive">*</span>
              </Label>
              <select
                id="edit-status"
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, status: e.target.value as TenantStatus }))
                }
              >
                <option value={TenantStatus.ACTIVE}>Aktif (Kullanıma Açık)</option>
                <option value={TenantStatus.SUSPENDED}>Askıya Alındı (Girişler Kilitli)</option>
              </select>
            </div>


            <DialogFooter>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => setEditingTenant(null)}
                disabled={updateMutation.isPending}
              >
                Vazgeç
              </AppButton>
              <AppButton type="submit" variant="primary" loading={updateMutation.isPending}>
                Değişiklikleri Kaydet
              </AppButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE TENANT CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(deletingTenant)}
        onOpenChange={(open) => !open && setDeletingTenant(null)}
        title={`"${deletingTenant?.name}" Silinsin mi?`}
        description="Bu OSGB kiracısını silmek istediğinizden emin misiniz? Bu işlem sonucunda ilgili OSGB erişimi kapatılacak ve arşivlenecektir."
        confirmLabel="Evet, OSGB'yi Sil"
        tone="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingTenant) {
            deleteMutation.mutate(deletingTenant.id);
          }
        }}
      />
    </>
  );
}
