import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/design-system/status-badge';
import { formatDateTime } from '@/features/patients/patient-utils';
import type { AuditEntry } from '@/types/audit';
import { describeAction, entityLabel } from './audit-labels';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-all text-foreground">{value || '—'}</dd>
    </div>
  );
}

function Json({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{title}</p>
      <pre className="scrollbar-subtle max-h-56 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs leading-5">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/** Full detail of one audit row: who / what / request context and the before/after snapshots. */
export function AuditEntryDialog({
  entry,
  onOpenChange,
}: {
  entry: AuditEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const action = entry ? describeAction(entry) : null;
  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {entry ? entityLabel(entry.entityType) : 'Kayıt'}
            {action ? <StatusBadge status={action.status} label={action.label} /> : null}
          </DialogTitle>
          <DialogDescription>{entry ? formatDateTime(entry.createdAt) : ''}</DialogDescription>
        </DialogHeader>
        {entry ? (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Field
                label="Kullanıcı"
                value={
                  entry.user
                    ? `${entry.user.firstName} ${entry.user.lastName} · ${entry.user.email}`
                    : 'Sistem'
                }
              />
              <Field label="Kayıt kimliği" value={entry.entityId} />
              <Field
                label="İstek"
                value={
                  entry.metadata?.path
                    ? `${entry.metadata.method ?? ''} ${entry.metadata.path}`.trim()
                    : null
                }
              />
              <Field
                label="Sonuç"
                value={
                  entry.metadata?.outcome
                    ? `${entry.metadata.outcome}${entry.metadata.statusCode ? ` · HTTP ${entry.metadata.statusCode}` : ''}${entry.metadata.errorCode ? ` · ${entry.metadata.errorCode}` : ''}`
                    : null
                }
              />
              <Field
                label="Süre"
                value={
                  entry.metadata?.durationMs !== undefined
                    ? `${entry.metadata.durationMs} ms`
                    : null
                }
              />
              <Field label="IP" value={entry.ipAddress} />
              <Field label="İstek kimliği" value={entry.requestId} />
              <div className="col-span-2 sm:col-span-3">
                <Field label="Tarayıcı" value={entry.userAgent} />
              </div>
            </dl>
            <Json title="Önceki değer" value={entry.oldValue} />
            <Json title="Yeni değer" value={entry.newValue} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
