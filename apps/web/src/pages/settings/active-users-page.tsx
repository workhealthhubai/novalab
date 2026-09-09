import { LogOut, RefreshCw, ShieldOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PERMISSIONS } from '@osgb/shared-types';
import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppButton } from '@/design-system/app-button';
import { ConfirmDialog } from '@/design-system/confirm-dialog';
import { EmptyState } from '@/design-system/empty-state';
import { ErrorState } from '@/design-system/error-state';
import { LoadingState } from '@/design-system/loading-state';
import { PageHeader } from '@/design-system/page-header';
import { toast } from '@/design-system/toast';
import { formatDateTime } from '@/features/patients/patient-utils';
import { describeDevice } from '@/features/sessions/device';
import { useActiveSessions, useSessionMutations } from '@/features/sessions/use-sessions';
import { toApiError } from '@/services/api-client';
import type { ActiveSession } from '@/types/session';

type Action =
  | { kind: 'session'; session: ActiveSession }
  | { kind: 'user'; userId: string; name: string; count: number }
  | null;

interface UserGroup {
  userId: string;
  name: string;
  email: string;
  sessions: ActiveSession[];
}

function groupByUser(sessions: ActiveSession[]): UserGroup[] {
  const groups = new Map<string, UserGroup>();
  for (const s of sessions) {
    const group = groups.get(s.userId) ?? {
      userId: s.userId,
      name: `${s.user.firstName} ${s.user.lastName}`,
      email: s.user.email,
      sessions: [],
    };
    group.sessions.push(s);
    groups.set(s.userId, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export function ActiveUsersPage() {
  const sessions = useActiveSessions();
  const mutations = useSessionMutations();
  const [action, setAction] = useState<Action>(null);
  const groups = useMemo(() => groupByUser(sessions.data ?? []), [sessions.data]);
  const fail = (title: string) => (error: unknown) => toast.error(title, toApiError(error).message);

  return (
    <>
      <PageHeader
        title="Aktif Kullanıcılar"
        description="Şu anda açık oturumlar; cihaz, IP ve son etkinlik. Kapatılan oturum bir sonraki yenilemede düşer."
        breadcrumbs={[{ label: 'Genel Ayarlar' }, { label: 'Aktif Kullanıcılar' }]}
        actions={
          <AppButton
            variant="secondary"
            onClick={() => void sessions.refetch()}
            loading={sessions.isFetching && !sessions.isPending}
          >
            <RefreshCw />
            Yenile
          </AppButton>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{groups.length}</strong> kullanıcı ·{' '}
            <strong className="text-foreground">{sessions.data?.length ?? 0}</strong> oturum
          </span>
          <span className="text-xs">Liste 30 saniyede bir yenilenir.</span>
        </div>
        {sessions.isPending ? (
          <LoadingState title="Oturumlar yükleniyor…" className="min-h-48 rounded-none border-0" />
        ) : null}
        {sessions.error ? (
          <ErrorState onRetry={() => void sessions.refetch()} className="rounded-none border-0" />
        ) : null}
        {sessions.data ? (
          groups.length === 0 ? (
            <EmptyState title="Açık oturum yok" className="rounded-none border-0" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Cihaz</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Son etkinlik</TableHead>
                  <TableHead>Oturum bitişi</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) =>
                  group.sessions.map((session, index) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium text-foreground">
                        {index === 0 ? (
                          <>
                            {group.name}
                            <span className="block text-xs font-normal text-muted-foreground">
                              {group.email}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">↳ aynı kullanıcı</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          {describeDevice(session.userAgent)}
                          {session.current ? <Badge>Bu oturum</Badge> : null}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {session.ipAddress ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(session.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(session.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Can permission={PERMISSIONS.USERS_UPDATE}>
                          <div className="flex justify-end gap-1">
                            <AppButton
                              size="sm"
                              variant="ghost"
                              aria-label={`${group.name} oturumunu kapat`}
                              onClick={() => setAction({ kind: 'session', session })}
                            >
                              <LogOut />
                              Kapat
                            </AppButton>
                            {index === 0 && group.sessions.length > 1 ? (
                              <AppButton
                                size="sm"
                                variant="ghost"
                                aria-label={`${group.name} tüm oturumlarını kapat`}
                                onClick={() =>
                                  setAction({
                                    kind: 'user',
                                    userId: group.userId,
                                    name: group.name,
                                    count: group.sessions.length,
                                  })
                                }
                              >
                                <ShieldOff />
                                Tümünü kapat
                              </AppButton>
                            ) : null}
                          </div>
                        </Can>
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          )
        ) : null}
      </div>

      <ConfirmDialog
        open={action?.kind === 'session'}
        onOpenChange={(open) => !open && setAction(null)}
        title={
          action?.kind === 'session' && action.session.current
            ? 'Kendi oturumunuzu kapatmak üzeresiniz'
            : 'Oturum kapatılsın mı?'
        }
        description={
          action?.kind === 'session'
            ? `${action.session.user.firstName} ${action.session.user.lastName} · ${describeDevice(action.session.userAgent)}. Kullanıcı bir sonraki yenilemede giriş sayfasına düşer.`
            : undefined
        }
        confirmLabel="Oturumu kapat"
        loading={mutations.revoke.isPending}
        onConfirm={() =>
          action?.kind === 'session' &&
          mutations.revoke.mutate(action.session.id, {
            onSuccess: () => {
              toast.success('Oturum kapatıldı');
              setAction(null);
            },
            onError: fail('Kapatılamadı'),
          })
        }
      />
      <ConfirmDialog
        open={action?.kind === 'user'}
        onOpenChange={(open) => !open && setAction(null)}
        title="Tüm oturumlar kapatılsın mı?"
        description={
          action?.kind === 'user'
            ? `${action.name} kullanıcısının ${action.count} açık oturumu kapatılır (kayıp cihaz, şüpheli erişim).`
            : undefined
        }
        confirmLabel="Tümünü kapat"
        loading={mutations.revokeAll.isPending}
        onConfirm={() =>
          action?.kind === 'user' &&
          mutations.revokeAll.mutate(action.userId, {
            onSuccess: ({ revoked }) => {
              toast.success(`${revoked} oturum kapatıldı`);
              setAction(null);
            },
            onError: fail('Kapatılamadı'),
          })
        }
      />
    </>
  );
}
