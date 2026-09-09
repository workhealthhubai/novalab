import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { TableCell, TableRow } from '@/components/ui/table';
import { AppButton } from '@/design-system/app-button';
import { FilterChip } from '@/design-system/filter-chip';
import { StatusBadge, type Status } from '@/design-system/status-badge';
import { formatDateTime, maskNationalId, patientPath } from '@/features/patients/patient-utils';
import type { ProtocolWorklistItem } from '@/types/protocol';
import { PROTOCOL_TYPE_LABELS } from './protocol-labels';
import { protocolPath } from './protocol-utils';
import { type WorkStatus } from './use-protocols';

/** "Tümü / Bekleyen / Tamamlanan" chips shared by the doctor-module lists. */
export function WorkStatusChips({
  value,
  onChange,
  pendingCount,
}: {
  value: WorkStatus;
  onChange: (v: WorkStatus) => void;
  pendingCount?: number;
}) {
  return (
    <>
      <FilterChip label="Tümü" active={value === 'ALL'} onClick={() => onChange('ALL')} />
      <FilterChip
        label={pendingCount ? `Bekleyen (${pendingCount})` : 'Bekleyen'}
        active={value === 'PENDING'}
        onClick={() => onChange(value === 'PENDING' ? 'ALL' : 'PENDING')}
      />
      <FilterChip
        label="Tamamlanan"
        active={value === 'DONE'}
        onClick={() => onChange(value === 'DONE' ? 'ALL' : 'DONE')}
      />
    </>
  );
}

interface PendingProtocolRowsProps {
  rows: ProtocolWorklistItem[];
  /** Result columns between "Hasta" and "Durum" that the pending row spans with the protocol summary. */
  fill: number;
  /** Columns between "Durum" and "İşlem" (filled with dashes). */
  trailing?: number;
  statusLabel?: string;
  action: (row: ProtocolWorklistItem) => ReactNode;
}

/** Rows for protocols still waiting for this module's record — same table, status "Bekliyor". */
export function PendingProtocolRows({
  rows,
  fill,
  trailing = 0,
  statusLabel = 'Bekliyor',
  action,
}: PendingProtocolRowsProps) {
  return (
    <>
      {rows.map((row) => (
        <TableRow key={`pending-${row.id}`} className="bg-warning-soft/30">
          <TableCell className="whitespace-nowrap">{formatDateTime(row.openedAt)}</TableCell>
          <TableCell className="font-medium text-foreground">
            <Link to={patientPath(row.employee.id)} className="hover:underline">
              {row.employee.firstName} {row.employee.lastName}
            </Link>
            <span className="block font-mono text-xs font-normal text-muted-foreground">
              {maskNationalId(row.employee.nationalId)}
            </span>
          </TableCell>
          <TableCell colSpan={Math.max(fill, 1)} className="text-muted-foreground">
            <Link to={protocolPath(row.id)} className="font-mono text-primary hover:underline">
              {row.protocolNumber}
            </Link>
            {' · '}
            {PROTOCOL_TYPE_LABELS[row.type]}
            {row.company ? ` · ${row.company.name}` : ''}
            {row.pendingCount > 1 ? ` · ${row.pendingCount} bekleyen tetkik` : ''}
          </TableCell>
          <TableCell>
            <StatusBadge status="waiting" label={statusLabel} />
          </TableCell>
          {Array.from({ length: trailing }, (_, i) => (
            <TableCell key={i} className="text-muted-foreground">
              —
            </TableCell>
          ))}
          <TableCell className="text-right">{action(row)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

/** Trailing "Durum" + "İşlem" cells for a completed record row. */
export function RecordStatusCells({
  to,
  label = 'Tamamlandı',
  status = 'completed',
  actionLabel = 'Aç',
}: {
  to: string;
  label?: string;
  status?: Status;
  actionLabel?: string;
}) {
  return (
    <>
      <TableCell>
        <StatusBadge status={status} label={label} />
      </TableCell>
      <TableCell className="text-right">
        <AppButton size="sm" variant="ghost" asChild>
          <Link to={to} onClick={(e) => e.stopPropagation()}>
            {actionLabel}
          </Link>
        </AppButton>
      </TableCell>
    </>
  );
}
